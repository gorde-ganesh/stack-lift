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

export const stackLiftSchemas = {
  findings: findingsSchema,
  plan: planSchema,
} as const;
