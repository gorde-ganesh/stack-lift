export const SCHEMA_VERSION = '1.0';

export const findingsSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stack-lift.dev/schemas/findings.schema.json',
  title: 'StackLift Findings',
  type: 'object',
  required: ['schemaVersion', 'generatedAt', 'summary', 'findings'],
  properties: {
    schemaVersion: { const: SCHEMA_VERSION },
    generatedAt: { type: 'string', format: 'date-time' },
    summary: {
      type: 'object',
      required: ['totalFindings', 'deprecated', 'peerConflicts'],
      properties: {
        totalFindings: { type: 'integer', minimum: 0 },
        deprecated: { type: 'integer', minimum: 0 },
        peerConflicts: { type: 'integer', minimum: 0 },
      },
      additionalProperties: true,
    },
    findings: { type: 'array', items: { type: 'object' } },
  },
  additionalProperties: true,
} as const;

export const planSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stack-lift.dev/schemas/plan.schema.json',
  title: 'StackLift Upgrade Plan',
  type: 'object',
  required: ['schemaVersion', 'framework', 'fromVersion', 'toVersion', 'steps'],
  properties: {
    schemaVersion: { const: SCHEMA_VERSION },
    framework: { type: 'string' },
    fromVersion: { type: 'string' },
    toVersion: { type: 'string' },
    strategy: { enum: ['direct', 'incremental'] },
    steps: { type: 'array', items: { type: 'object' } },
  },
  additionalProperties: true,
} as const;
