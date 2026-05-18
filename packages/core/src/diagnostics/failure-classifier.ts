import type {
  FailureCategory,
  FailureDiagnostic,
  DiagnosticSummary,
  BuildValidationResult,
  RemediationSuggestion,
  Confidence,
} from '@stack-lift/shared';

interface ClassifierRule {
  category: FailureCategory;
  patterns: RegExp[];
  summary: string;
  confidence: Confidence;
  remediations: RemediationSuggestion[];
}

const RULES: ClassifierRule[] = [
  {
    category: 'peer-dependency-conflict',
    patterns: [
      /ERESOLVE/i,
      /unmet peer/i,
      /peer dep.*required/i,
      /incompatible.*peer/i,
      /npm ERR!.*peer/i,
    ],
    summary: 'Peer dependency conflict detected',
    confidence: 'high',
    remediations: [
      {
        action: 'Use --legacy-peer-deps to bypass strict peer resolution (npm only)',
        command: 'npm install --legacy-peer-deps',
      },
      {
        action: 'Audit peer conflicts and align package versions manually',
        command: 'npm ls --depth=1',
      },
      {
        action: 'Check Angular compatibility matrix for your dependency versions',
        docsUrl: 'https://angular.dev/reference/releases',
      },
    ],
  },
  {
    category: 'angular-compiler-incompatibility',
    patterns: [
      /NG\d{4}/,
      /angular compiler/i,
      /ngtsc/i,
      /ivy.*error/i,
      /\[ng\]/i,
      /ngc.*error/i,
      /@angular\/compiler/i,
    ],
    summary: 'Angular compiler error — likely a breaking API or incompatible decorator usage',
    confidence: 'high',
    remediations: [
      {
        action: 'Review Angular migration guide for the target version',
        docsUrl: 'https://update.angular.io/',
      },
      {
        action: 'Run ng update to apply Angular schematic migrations',
        command: 'ng update @angular/core @angular/cli',
      },
      {
        action: 'Check for deprecated APIs flagged in the breaking-change analysis above',
      },
    ],
  },
  {
    category: 'builder-config-mismatch',
    patterns: [
      /builder.*not found/i,
      /schema.*validation.*failed/i,
      /invalid.*angular\.json/i,
      /cannot read.*angular\.json/i,
      /unknown.*builder/i,
      /@angular-devkit\/build-angular.*not found/i,
      /project.*not found.*angular/i,
    ],
    summary: 'angular.json builder configuration is invalid or references a missing builder',
    confidence: 'high',
    remediations: [
      {
        action: 'Update @angular-devkit/build-angular to match the target Angular version',
        command: 'npm install @angular-devkit/build-angular@latest',
      },
      {
        action: 'Verify angular.json builder paths match the installed builder package',
      },
      {
        action: 'Run the Angular config migration to update angular.json builder references',
        command: 'stack-lift apply . --apply',
      },
    ],
  },
  {
    category: 'test-runner-breakage',
    patterns: [
      /karma.*error/i,
      /jasmine.*error/i,
      /jest.*error/i,
      /no tests were found/i,
      /test suite failed to run/i,
      /cannot find.*spec/i,
      /karma.*not found/i,
      /karma-chrome-launcher/i,
    ],
    summary: 'Test runner failure — test runner may need migration or reconfiguration',
    confidence: 'medium',
    remediations: [
      {
        action: 'If using Karma, consider migrating to Jest or Web Test Runner',
        docsUrl: 'https://angular.dev/guide/testing',
      },
      {
        action: 'Update test runner packages to versions compatible with your Angular version',
        command: 'npm install karma@latest karma-jasmine@latest karma-chrome-launcher@latest',
      },
      {
        action:
          'Check if the test runner schema changed in angular.json for the new Angular version',
      },
    ],
  },
  {
    category: 'typescript-error',
    patterns: [/error TS\d{4}/, /TS\d{4}:/, /TypeScript.*error/i, /tsc.*failed/i],
    summary: 'TypeScript compilation error — likely incompatible types or compiler option changes',
    confidence: 'high',
    remediations: [
      {
        action: 'Review TypeScript changelog for breaking changes relevant to your target version',
        docsUrl: 'https://www.typescriptlang.org/docs/handbook/release-notes/overview.html',
      },
      {
        action: 'Run tsc --strict to see all strict-mode type errors',
        command: 'npx tsc --noEmit --strict',
      },
      {
        action:
          'Update tsconfig.json target/lib settings if required by the new Angular/TS version',
      },
    ],
  },
  {
    category: 'module-not-found',
    patterns: [
      /Cannot find module/i,
      /MODULE_NOT_FOUND/,
      /Cannot resolve/i,
      /Module not found/i,
      /Error: Cannot find/i,
    ],
    summary: 'Module resolution failure — a package is missing or import paths changed',
    confidence: 'high',
    remediations: [
      {
        action: 'Install missing packages',
        command: 'npm install',
      },
      {
        action:
          'Check if package import paths changed (e.g. @angular/core/testing → @angular/core/testing)',
      },
      {
        action: 'Verify all packages listed in package.json are compatible with each other',
      },
    ],
  },
  {
    category: 'timeout',
    patterns: [/timed out/i, /ETIMEDOUT/, /operation.*timeout/i],
    summary: 'Build step timed out',
    confidence: 'high',
    remediations: [
      { action: 'Increase the timeout threshold for this build step' },
      {
        action: 'Investigate slow build steps — this may indicate a dependency resolution loop',
      },
    ],
  },
];

function classifyError(error: string): FailureDiagnostic | null {
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(error))) {
      return {
        category: rule.category,
        summary: rule.summary,
        detail: extractRelevantLines(error),
        remediations: rule.remediations,
        confidence: rule.confidence,
      };
    }
  }
  return {
    category: 'unknown',
    summary: 'Unclassified build failure',
    detail: extractRelevantLines(error),
    remediations: [
      { action: 'Review the full error output above for clues' },
      {
        action: 'Check the Angular update guide for your version pair',
        docsUrl: 'https://update.angular.io/',
      },
    ],
    confidence: 'low',
  };
}

function extractRelevantLines(error: string): string {
  const lines = error.split('\n').filter((l) => l.trim().length > 0);
  const errorLines = lines.filter((l) => /error|failed|cannot|unable/i.test(l));
  const relevant = errorLines.length > 0 ? errorLines : lines;
  return relevant.slice(0, 5).join('\n');
}

export function classifyBuildFailure(result: BuildValidationResult): FailureDiagnostic[] {
  if (result.status !== 'failed') return [];
  const errorText = result.error ?? result.output ?? '';
  if (!errorText) return [];
  const diagnostic = classifyError(errorText);
  return diagnostic ? [diagnostic] : [];
}

export function buildDiagnosticSummary(results: BuildValidationResult[]): DiagnosticSummary {
  const allDiagnostics = results.flatMap((r) => r.diagnostics ?? []);
  const categories = [...new Set(allDiagnostics.map((d) => d.category))];
  return {
    totalFailures: results.filter((r) => r.status === 'failed').length,
    categories,
    diagnostics: allDiagnostics,
  };
}
