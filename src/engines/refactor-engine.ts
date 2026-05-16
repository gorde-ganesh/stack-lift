import * as fs from 'node:fs';
import { Project, SyntaxKind, Node, SourceFile } from 'ts-morph';
import type { CodeSuggestion, RefactorResult } from '../types/index.js';

export interface RefactorOptions {
  /** If true, compute diffs but do not write any files. */
  dryRun?: boolean;
}

export interface TransformResult {
  description: string;
  before?: string;
  after?: string;
}

// ── Individual AST transforms ────────────────────────────────────────────────

function replaceTestBedGet(source: SourceFile): TransformResult[] {
  const applied: TransformResult[] = [];
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression();
    if (
      Node.isPropertyAccessExpression(expr) &&
      expr.getExpression().getText() === 'TestBed' &&
      expr.getName() === 'get'
    ) {
      const before = call.getText();
      expr.getNameNode().replaceWithText('inject');
      applied.push({
        description: 'Replace TestBed.get() with TestBed.inject()',
        before,
        after: call.getText(),
      });
    }
  }
  return applied;
}

function replaceReactDOMRender(source: SourceFile): TransformResult[] {
  const applied: TransformResult[] = [];

  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression();
    if (!Node.isPropertyAccessExpression(expr) || expr.getName() !== 'render') continue;

    const obj = expr.getExpression();
    if (obj.getText() !== 'ReactDOM') continue;

    const args = call.getArguments();
    if (args.length < 2) continue;
    const arg0 = args[0];
    const arg1 = args[1];
    if (!arg0 || !arg1) continue;

    const before = call.getText();
    const jsx = arg0.getText();
    const container = arg1.getText();
    call.replaceWithText(`createRoot(${container}).render(${jsx})`);

    applied.push({
      description: 'Replace ReactDOM.render() with createRoot().render()',
      before,
      after: `createRoot(${container}).render(${jsx})`,
    });
  }

  // Add createRoot import if we made any replacements
  if (applied.length > 0) {
    ensureNamedImport(source, 'react-dom/client', 'createRoot');
    removeNamedImport(source, 'react-dom', 'render');
  }

  return applied;
}

function replaceReactDOMHydrate(source: SourceFile): TransformResult[] {
  const applied: TransformResult[] = [];

  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression();
    if (!Node.isPropertyAccessExpression(expr) || expr.getName() !== 'hydrate') continue;

    if (expr.getExpression().getText() !== 'ReactDOM') continue;

    const args = call.getArguments();
    if (args.length < 2) continue;
    const arg0 = args[0];
    const arg1 = args[1];
    if (!arg0 || !arg1) continue;

    const before = call.getText();
    const jsx = arg0.getText();
    const container = arg1.getText();
    call.replaceWithText(`hydrateRoot(${container}, ${jsx})`);

    applied.push({
      description: 'Replace ReactDOM.hydrate() with hydrateRoot()',
      before,
      after: `hydrateRoot(${container}, ${jsx})`,
    });
  }

  if (applied.length > 0) {
    ensureNamedImport(source, 'react-dom/client', 'hydrateRoot');
  }

  return applied;
}

function replaceHttpModule(source: SourceFile): TransformResult[] {
  const applied: TransformResult[] = [];

  for (const decl of source.getDescendantsOfKind(SyntaxKind.ImportDeclaration)) {
    const moduleSpec = decl.getModuleSpecifierValue();
    if (moduleSpec !== '@angular/http') continue;

    const before = decl.getText();
    decl.setModuleSpecifier('@angular/common/http');

    const named = decl.getNamedImports();
    for (const imp of named) {
      if (imp.getName() === 'HttpModule') {
        imp.setName('HttpClientModule');
      }
      if (imp.getName() === 'Http') {
        imp.setName('HttpClient');
      }
    }

    applied.push({
      description: 'Replace @angular/http import with @angular/common/http',
      before,
      after: decl.getText(),
    });
  }

  return applied;
}

function replaceInitialNavigation(source: SourceFile): TransformResult[] {
  const applied: TransformResult[] = [];

  for (const literal of source.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
    if (literal.getLiteralValue() !== 'enabled') continue;

    const parent = literal.getParent();
    if (!Node.isPropertyAssignment(parent)) continue;
    if (parent.getName() !== 'initialNavigation') continue;

    const before = literal.getText();
    literal.replaceWithText("'enabledBlocking'");

    applied.push({
      description: "Replace initialNavigation: 'enabled' with 'enabledBlocking'",
      before,
      after: "'enabledBlocking'",
    });
  }

  return applied;
}

// ── Import helpers ───────────────────────────────────────────────────────────

function ensureNamedImport(source: SourceFile, module: string, name: string): void {
  const existing = source.getImportDeclaration((d) => d.getModuleSpecifierValue() === module);
  if (existing) {
    const names = existing.getNamedImports().map((n) => n.getName());
    if (!names.includes(name)) {
      existing.addNamedImport(name);
    }
  } else {
    source.addImportDeclaration({ moduleSpecifier: module, namedImports: [name] });
  }
}

function removeNamedImport(source: SourceFile, module: string, name: string): void {
  const decl = source.getImportDeclaration((d) => d.getModuleSpecifierValue() === module);
  if (!decl) return;

  const named = decl.getNamedImports();
  const target = named.find((n) => n.getName() === name);
  if (!target) return;

  if (named.length === 1) {
    decl.remove();
  } else {
    target.remove();
  }
}

// ── Detection-only scanners (no mutations) ───────────────────────────────────

function detectUnsafeLifecycles(source: SourceFile): TransformResult[] {
  const text = source.getFullText();
  const patterns = [
    'UNSAFE_componentWillMount',
    'UNSAFE_componentWillReceiveProps',
    'UNSAFE_componentWillUpdate',
  ];
  const found = patterns.filter((p) => text.includes(p));
  if (found.length === 0) return [];
  return [{
    description: `Legacy unsafe React lifecycle detected (${found.join(', ')}). Manual migration required. See react.dev/blog/2018/03/27/update-on-async-rendering.html`,
  }];
}

function detectContextConsumer(source: SourceFile): TransformResult[] {
  const text = source.getFullText();
  // Match JSX <Something.Consumer> patterns
  if (!/<[A-Za-z_$][A-Za-z0-9_$]*\.Consumer[\s>]/.test(text)) return [];
  return [{
    description: 'Context.Consumer render-prop pattern detected. Consider migrating to useContext().',
  }];
}

function detectStringRefs(source: SourceFile): TransformResult[] {
  const text = source.getFullText();
  const hasStringRefAttr = /ref=["'][^"']+["']/.test(text);
  const hasThisRefs = /this\.refs\./.test(text);
  if (!hasStringRefAttr && !hasThisRefs) return [];
  return [{
    description: 'Legacy string ref detected. Manual migration to useRef() or createRef() recommended.',
  }];
}

// ── Transform dispatch ───────────────────────────────────────────────────────

const TRANSFORM_MAP: Record<string, (s: SourceFile) => TransformResult[]> = {
  'TestBed.get()': replaceTestBedGet,
  'ReactDOM.render': replaceReactDOMRender,
  'ReactDOM.hydrate': replaceReactDOMHydrate,
  HttpModule: replaceHttpModule,
  'initialNavigation router option': replaceInitialNavigation,
};

/** Detection-only scanners — report findings without modifying source files. */
const DETECTOR_MAP: Record<string, (s: SourceFile) => TransformResult[]> = {
  'UNSAFE lifecycle methods': detectUnsafeLifecycles,
  'Context.Consumer pattern': detectContextConsumer,
  'string refs': detectStringRefs,
};

export function hasAutomatedFix(apiName: string): boolean {
  return apiName in TRANSFORM_MAP;
}

/** Run detection-only scanners against a source file. Returns advisory findings. */
export function runDetectors(source: SourceFile): Array<{ api: string; description: string }> {
  const findings: Array<{ api: string; description: string }> = [];
  for (const [api, detect] of Object.entries(DETECTOR_MAP)) {
    for (const result of detect(source)) {
      findings.push({ api, description: result.description });
    }
  }
  return findings;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function applyRefactors(
  suggestions: CodeSuggestion[],
  options: RefactorOptions = {},
): RefactorResult[] {
  const { dryRun = false } = options;

  // Group suggestions by file and collect unique automated APIs
  const byFile = new Map<string, Set<string>>();
  for (const s of suggestions) {
    if (!s.change.automated) continue;
    const apis = byFile.get(s.file) ?? new Set<string>();
    apis.add(s.change.api);
    byFile.set(s.file, apis);
  }

  if (byFile.size === 0) return [];

  // Build a ts-morph project over the affected files only
  const project = new Project({
    compilerOptions: { allowJs: true, skipLibCheck: true },
    skipAddingFilesFromTsConfig: true,
  });

  for (const filePath of byFile.keys()) {
    if (fs.existsSync(filePath)) {
      project.addSourceFileAtPath(filePath);
    }
  }

  const results: RefactorResult[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    const apis = byFile.get(filePath);
    if (!apis) continue;

    const originalText = sourceFile.getFullText();
    const originalSuggestions = suggestions.filter((s) => s.file === filePath);
    const applied: string[] = [];

    for (const api of apis) {
      const transform = TRANSFORM_MAP[api];
      if (!transform) continue;
      const transforms = transform(sourceFile);
      applied.push(...transforms.map((t) => t.description));
    }

    if (applied.length === 0) continue;

    const newText = sourceFile.getFullText();
    const diff = originalText !== newText ? buildSimpleDiff(originalText, newText) : undefined;

    if (!dryRun) {
      sourceFile.saveSync();
    }

    results.push({
      file: filePath,
      suggestions: originalSuggestions,
      applied,
      ...(diff !== undefined ? { diff } : {}),
    });
  }

  return results;
}

function buildSimpleDiff(before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const out: string[] = [];

  const max = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < max; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === a) continue;
    if (b !== undefined) out.push(`- ${b}`);
    if (a !== undefined) out.push(`+ ${a}`);
  }

  return out.join('\n');
}
