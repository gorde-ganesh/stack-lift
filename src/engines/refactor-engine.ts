import * as fs from 'node:fs';
import type { CodeSuggestion, RefactorResult } from '../types/index.js';

interface Replacement {
  pattern: RegExp;
  replacement: string;
  description: string;
}

// Automated text-based replacements keyed by BreakingChange.api
const AUTOMATED_REPLACEMENTS: Record<string, Replacement[]> = {
  'HttpModule': [
    {
      pattern: /import\s*\{([^}]*)HttpModule([^}]*)\}\s*from\s*['"]@angular\/http['"]/g,
      replacement: "import {$1HttpClientModule$2} from '@angular/common/http'",
      description: "Replace HttpModule import with HttpClientModule",
    },
    {
      pattern: /\bHttpModule\b/g,
      replacement: 'HttpClientModule',
      description: 'Replace HttpModule usage with HttpClientModule',
    },
  ],

  'TestBed.get()': [
    {
      pattern: /TestBed\.get\(/g,
      replacement: 'TestBed.inject(',
      description: 'Replace TestBed.get() with TestBed.inject()',
    },
  ],

  "initialNavigation router option": [
    {
      pattern: /initialNavigation:\s*['"]enabled['"]/g,
      replacement: "initialNavigation: 'enabledBlocking'",
      description: "Replace initialNavigation: 'enabled' with 'enabledBlocking'",
    },
  ],

  'ReactDOM.render': [
    {
      // Replace: import ReactDOM from 'react-dom' → add 'react-dom/client' import
      pattern: /ReactDOM\.render\(\s*(<[\s\S]*?>|\([^)]*\)),\s*([^)]+)\)/g,
      replacement: 'createRoot($2).render($1)',
      description: 'Replace ReactDOM.render() with createRoot().render()',
    },
  ],

  'ReactDOM.hydrate': [
    {
      pattern: /ReactDOM\.hydrate\(\s*(<[\s\S]*?>|\([^)]*\)),\s*([^)]+)\)/g,
      replacement: 'hydrateRoot($2, $1)',
      description: 'Replace ReactDOM.hydrate() with hydrateRoot()',
    },
  ],

  'React import for JSX': [
    {
      pattern: /^import React from ['"]react['"];?\n/m,
      replacement: '',
      description: 'Remove unused React import (new JSX transform)',
    },
    {
      pattern: /^import React, \{/m,
      replacement: 'import {',
      description: 'Remove default React import, keep named imports',
    },
  ],

  '*ngIf structural directive': [
    {
      // Simple *ngIf="expr" → @if (expr) { ... } is too complex for regex;
      // flag the occurrences instead and let the Angular migration schematic handle it
      pattern: /\*ngIf=/g,
      replacement: '*ngIf=',
      description: 'Run ng g @angular/core:control-flow to migrate *ngIf to @if',
    },
  ],
};

function applyReplacementsToFile(
  filePath: string,
  apiName: string
): { changed: boolean; descriptions: string[] } {
  const replacements = AUTOMATED_REPLACEMENTS[apiName];
  if (!replacements) return { changed: false, descriptions: [] };

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return { changed: false, descriptions: [] };
  }

  const original = content;
  const applied: string[] = [];

  for (const r of replacements) {
    const next = content.replace(r.pattern, r.replacement);
    if (next !== content) {
      content = next;
      applied.push(r.description);
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { changed: true, descriptions: applied };
  }

  return { changed: false, descriptions: [] };
}

export function applyRefactors(suggestions: CodeSuggestion[]): RefactorResult[] {
  // Group suggestions by file
  const byFile = new Map<string, CodeSuggestion[]>();
  for (const s of suggestions) {
    const list = byFile.get(s.file) ?? [];
    list.push(s);
    byFile.set(s.file, list);
  }

  const results: RefactorResult[] = [];

  for (const [file, fileSuggestions] of byFile) {
    // Only process automated changes
    const automated = fileSuggestions.filter((s) => s.change.automated);
    if (automated.length === 0) continue;

    // Deduplicate by API name within a file
    const seenApis = new Set<string>();
    const appliedSuggestions: string[] = [];

    for (const s of automated) {
      if (seenApis.has(s.change.api)) continue;
      seenApis.add(s.change.api);

      const { changed, descriptions } = applyReplacementsToFile(file, s.change.api);
      if (changed) appliedSuggestions.push(...descriptions);
    }

    if (appliedSuggestions.length > 0) {
      results.push({ file, suggestions: fileSuggestions, ...{ appliedCount: appliedSuggestions.length } } as RefactorResult & { appliedCount: number });
      results[results.length - 1] = {
        file,
        suggestions: fileSuggestions.filter((s) => s.change.automated),
      };
    }
  }

  return results;
}

export function hasAutomatedFix(apiName: string): boolean {
  return apiName in AUTOMATED_REPLACEMENTS;
}
