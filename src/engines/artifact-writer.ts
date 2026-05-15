import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UpgradeReport, ArtifactFormat } from '../types/index.js';
import { generateMarkdownReport, generateJsonReport } from './doc-generator.js';

export interface ArtifactResult {
  format: ArtifactFormat;
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
