import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UpgradeReport, ArtifactFormat, ArtifactWriterMode } from '@stack-lift/shared';
import {
  generateMarkdownReport,
  generateJsonReport,
  generateFindingsJson,
  generateAnalysisJson,
  generatePlanJson,
  generateExecutionJson,
  generateValidationJson,
  generateAgentContractJson,
  generateDecisionsRequiredJson,
  generateAgentInstructionsMd,
  type SerializeOptions,
} from './doc-generator.js';

export interface ArtifactResult {
  format:
    | ArtifactFormat
    | 'agent-contract'
    | 'agent-instructions'
    | 'analysis'
    | 'decisions'
    | 'execution'
    | 'findings'
    | 'plan'
    | 'session'
    | 'validation';
  filePath: string;
}

export function writeArtifacts(
  report: UpgradeReport,
  outputDir: string,
  formats: ArtifactFormat[],
): ArtifactResult[] {
  fs.mkdirSync(outputDir, { recursive: true });

  const { framework, frameworkVersion } = report.stack;
  const { toVersion } = report.plan;
  const slug = `${framework.toLowerCase()}-${frameworkVersion}-to-${toVersion}`;

  const results: ArtifactResult[] = [];

  for (const format of formats) {
    if (format === 'markdown') {
      const content = generateMarkdownReport(report);
      const filePath = path.join(outputDir, `stacklift-report-${slug}.md`);
      fs.writeFileSync(filePath, content, 'utf-8');
      results.push({ format, filePath });
    } else if (format === 'json') {
      const content = generateJsonReport(report);
      const filePath = path.join(outputDir, `stacklift-report-${slug}.json`);
      fs.writeFileSync(filePath, content, 'utf-8');
      results.push({ format, filePath });
    }
  }

  return results;
}

export function writeMachineArtifacts(
  report: UpgradeReport,
  outputDir: string,
  opts?: SerializeOptions & { mode?: ArtifactWriterMode },
): ArtifactResult[] {
  fs.mkdirSync(outputDir, { recursive: true });

  const results: ArtifactResult[] = [];

  const analysisPath = path.join(outputDir, 'analysis.json');
  fs.writeFileSync(analysisPath, generateAnalysisJson(report, opts), 'utf-8');
  results.push({ format: 'analysis', filePath: analysisPath });

  const planPath = path.join(outputDir, 'plan.json');
  fs.writeFileSync(planPath, generatePlanJson(report, opts), 'utf-8');
  results.push({ format: 'plan', filePath: planPath });

  const executionPath = path.join(outputDir, 'execution.json');
  fs.writeFileSync(executionPath, generateExecutionJson(report, opts), 'utf-8');
  results.push({ format: 'execution', filePath: executionPath });

  const validationPath = path.join(outputDir, 'validation.json');
  fs.writeFileSync(validationPath, generateValidationJson(report, opts), 'utf-8');
  results.push({ format: 'validation', filePath: validationPath });

  // Keep findings.json for backward compatibility
  const findingsPath = path.join(outputDir, 'findings.json');
  fs.writeFileSync(findingsPath, generateFindingsJson(report, opts), 'utf-8');
  results.push({ format: 'findings', filePath: findingsPath });

  const mode: ArtifactWriterMode = opts?.mode ?? 'plan';

  const contractPath = path.join(outputDir, 'agent-contract.json');
  fs.writeFileSync(contractPath, generateAgentContractJson(report, mode, opts), 'utf-8');
  results.push({ format: 'agent-contract', filePath: contractPath });

  const decisionsPath = path.join(outputDir, 'decisions.required.json');
  fs.writeFileSync(decisionsPath, generateDecisionsRequiredJson(report, opts), 'utf-8');
  results.push({ format: 'decisions', filePath: decisionsPath });

  const instructionsPath = path.join(outputDir, 'agent-instructions.md');
  fs.writeFileSync(instructionsPath, generateAgentInstructionsMd(report, mode), 'utf-8');
  results.push({ format: 'agent-instructions', filePath: instructionsPath });

  return results;
}
