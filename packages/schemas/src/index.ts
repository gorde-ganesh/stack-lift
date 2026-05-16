export const SCHEMA_VERSION = '1.0';

export const findingsSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stack-lift.dev/schemas/findings.schema.json',
  title: 'StackLift findings',
  type: 'object',
  required: ['schemaVersion', 'generatedAt', 'project', 'summary', 'findings'],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: SCHEMA_VERSION },
    generatedAt: { type: 'string', format: 'date-time' },
    project: {
      type: 'object',
      required: ['framework', 'version', 'packageManager'],
      additionalProperties: true,
      properties: {
        framework: { type: 'string' },
        version: { type: 'string' },
        packageManager: { type: 'string' },
        lockfileParsed: { type: 'boolean' },
      },
    },
    summary: {
      type: 'object',
      required: ['totalFindings', 'deprecated', 'outdated', 'peerConflicts', 'codeIssues'],
      additionalProperties: false,
      properties: {
        totalFindings: { type: 'integer', minimum: 0 },
        deprecated: { type: 'integer', minimum: 0 },
        outdated: { type: 'integer', minimum: 0 },
        peerConflicts: { type: 'integer', minimum: 0 },
        codeIssues: { type: 'integer', minimum: 0 },
      },
    },
    findings: {
      type: 'array',
      items: { type: 'object', required: ['type'], additionalProperties: true },
    },
  },
} as const;

export const planSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stack-lift.dev/schemas/plan.schema.json',
  title: 'StackLift upgrade plan',
  type: 'object',
  required: [
    'schemaVersion',
    'generatedAt',
    'framework',
    'fromVersion',
    'toVersion',
    'strategy',
    'riskLevel',
    'estimatedEffort',
    'steps',
  ],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: SCHEMA_VERSION },
    generatedAt: { type: 'string', format: 'date-time' },
    framework: { type: 'string' },
    fromVersion: { type: 'string' },
    toVersion: { type: 'string' },
    strategy: { enum: ['direct', 'incremental'] },
    riskLevel: { enum: ['low', 'medium', 'high', 'critical'] },
    estimatedEffort: { type: 'string' },
    effortBasis: { type: 'string' },
    decisions: { type: ['object', 'null'] },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['fromVersion', 'toVersion', 'description', 'npmInstall', 'manualActions'],
        additionalProperties: true,
        properties: {
          fromVersion: { type: 'string' },
          toVersion: { type: 'string' },
          description: { type: 'string' },
          referenceUrl: { type: ['string', 'null'] },
          npmInstall: { type: 'array', items: { type: 'string' } },
          manualActions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    buildValidation: { type: ['array', 'null'] },
  },
} as const;

export const analysisSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stack-lift.dev/schemas/analysis.schema.json',
  title: 'StackLift analysis',
  type: 'object',
  required: ['schemaVersion', 'generatedAt', 'project', 'summary', 'findings'],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: SCHEMA_VERSION },
    generatedAt: { type: 'string', format: 'date-time' },
    project: {
      type: 'object',
      required: ['framework', 'version', 'packageManager'],
      additionalProperties: true,
      properties: {
        framework: { type: 'string' },
        version: { type: 'string' },
        packageManager: { type: 'string' },
        lockfileParsed: { type: 'boolean' },
      },
    },
    summary: {
      type: 'object',
      required: ['totalFindings', 'deprecated', 'outdated', 'peerConflicts', 'codeIssues'],
      additionalProperties: false,
      properties: {
        codeIssues: { type: 'integer', minimum: 0 },
        deprecated: { type: 'integer', minimum: 0 },
        outdated: { type: 'integer', minimum: 0 },
        peerConflicts: { type: 'integer', minimum: 0 },
        totalFindings: { type: 'integer', minimum: 0 },
      },
    },
    findings: {
      type: 'array',
      items: { type: 'object', required: ['type'], additionalProperties: true },
    },
  },
} as const;

export const executionSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stack-lift.dev/schemas/execution.schema.json',
  title: 'StackLift execution',
  type: 'object',
  required: ['schemaVersion', 'generatedAt', 'project', 'summary', 'files'],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: SCHEMA_VERSION },
    generatedAt: { type: 'string', format: 'date-time' },
    project: {
      type: 'object',
      required: ['framework', 'version', 'targetVersion'],
      additionalProperties: false,
      properties: {
        framework: { type: 'string' },
        version: { type: 'string' },
        targetVersion: { type: 'string' },
      },
    },
    summary: {
      type: 'object',
      required: ['applied', 'filesModified', 'filesScanned', 'totalSuggestions'],
      additionalProperties: false,
      properties: {
        applied: { type: 'integer', minimum: 0 },
        filesModified: { type: 'integer', minimum: 0 },
        filesScanned: { type: 'integer', minimum: 0 },
        totalSuggestions: { type: 'integer', minimum: 0 },
      },
    },
    files: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'suggestions'],
        additionalProperties: true,
        properties: {
          applied: { type: 'array', items: { type: 'string' } },
          file: { type: 'string' },
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['api', 'automated', 'description', 'severity'],
              additionalProperties: true,
              properties: {
                api: { type: 'string' },
                automated: { type: 'boolean' },
                confidence: { type: 'string' },
                description: { type: 'string' },
                line: { type: ['integer', 'null'] },
                severity: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const validationSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stack-lift.dev/schemas/validation.schema.json',
  title: 'StackLift validation',
  type: 'object',
  required: ['schemaVersion', 'generatedAt', 'project', 'summary', 'postMigration'],
  additionalProperties: false,
  properties: {
    schemaVersion: { const: SCHEMA_VERSION },
    generatedAt: { type: 'string', format: 'date-time' },
    project: {
      type: 'object',
      required: ['framework', 'targetVersion', 'version'],
      additionalProperties: false,
      properties: {
        framework: { type: 'string' },
        targetVersion: { type: 'string' },
        version: { type: 'string' },
      },
    },
    summary: {
      type: 'object',
      required: ['failed', 'passed', 'regressions', 'skipped', 'totalSteps'],
      additionalProperties: false,
      properties: {
        failed: { type: 'integer', minimum: 0 },
        passed: { type: 'integer', minimum: 0 },
        regressions: { type: 'integer', minimum: 0 },
        skipped: { type: 'integer', minimum: 0 },
        totalSteps: { type: 'integer', minimum: 0 },
      },
    },
    baseline: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        required: ['status', 'step'],
        additionalProperties: true,
        properties: {
          durationMs: { type: 'number' },
          error: { type: 'string' },
          status: { enum: ['failed', 'skipped', 'success'] },
          step: { type: 'string' },
        },
      },
    },
    postMigration: {
      type: 'array',
      items: {
        type: 'object',
        required: ['status', 'step'],
        additionalProperties: true,
        properties: {
          durationMs: { type: 'number' },
          error: { type: 'string' },
          status: { enum: ['failed', 'skipped', 'success'] },
          step: { type: 'string' },
        },
      },
    },
    regressions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

export const stackLiftSchemas = {
  analysis: analysisSchema,
  execution: executionSchema,
  findings: findingsSchema,
  plan: planSchema,
  validation: validationSchema,
} as const;
