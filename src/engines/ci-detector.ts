import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CiNodeVersionFinding {
  file: string;
  nodeVersion: string;
  meetsMinimum: boolean;
  minimumRequired: string;
}

export interface CiDetectionResult {
  configsFound: string[];
  nodeVersionFindings: CiNodeVersionFinding[];
  hasConflict: boolean;
}

const CI_CONFIG_PATHS = [
  '.github/workflows',
  '.gitlab-ci.yml',
  'azure-pipelines.yml',
  '.circleci/config.yml',
  'Jenkinsfile',
  '.travis.yml',
  'bitbucket-pipelines.yml',
];

/** Node.js minimum version required per Angular major version. */
const ANGULAR_NODE_MINIMUMS: Record<number, string> = {
  12: '12.20.0',
  13: '12.20.0',
  14: '14.15.0',
  15: '14.20.0',
  16: '16.14.0',
  17: '18.13.0',
  18: '18.19.0',
  19: '18.19.0',
  20: '18.19.0',
};

function semverMeetsMinimum(version: string, minimum: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [ma, mi, pa] = parse(version);
  const [mma, mmi, mpa] = parse(minimum);
  if (ma !== mma) return (ma ?? 0) > (mma ?? 0);
  if (mi !== mmi) return (mi ?? 0) > (mmi ?? 0);
  return (pa ?? 0) >= (mpa ?? 0);
}

function extractNodeVersions(content: string): string[] {
  const versions: string[] = [];
  // Match node-version: 'X', node-version: X, node: X.x, "node": "X"
  const patterns = [
    /node[-_]version['":\s]+['"]?v?(\d+[\d.]*)/gi,
    /node:\s+['"]?v?(\d+[\d.]*)/gi,
    /NODE_VERSION['":\s]+['"]?v?(\d+[\d.]*)/gi,
    /uses:\s+actions\/setup-node[^]+?node-version:\s+['"]?v?(\d+[\d.]*)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const ver = m[1]?.trim();
      if (ver && !versions.includes(ver)) {
        versions.push(ver);
      }
    }
  }
  return versions;
}

function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function collectWorkflowFiles(workflowsDir: string): string[] {
  try {
    return fs
      .readdirSync(workflowsDir)
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
      .map((f) => path.join(workflowsDir, f));
  } catch {
    return [];
  }
}

export function detectCiNodeVersions(
  projectPath: string,
  targetAngularVersion?: number,
): CiDetectionResult {
  const resolved = path.resolve(projectPath);
  const configsFound: string[] = [];
  const nodeVersionFindings: CiNodeVersionFinding[] = [];

  const minimumRequired = targetAngularVersion
    ? (ANGULAR_NODE_MINIMUMS[targetAngularVersion] ?? '0.0.0')
    : '0.0.0';

  const filesToCheck: string[] = [];

  for (const ciPath of CI_CONFIG_PATHS) {
    const full = path.join(resolved, ciPath);
    if (ciPath === '.github/workflows') {
      const workflows = collectWorkflowFiles(full);
      filesToCheck.push(...workflows);
      if (workflows.length > 0) configsFound.push('.github/workflows/');
    } else {
      if (fs.existsSync(full)) {
        filesToCheck.push(full);
        configsFound.push(ciPath);
      }
    }
  }

  for (const filePath of filesToCheck) {
    const content = readFile(filePath);
    if (!content) continue;

    const nodeVersions = extractNodeVersions(content);
    const relPath = path.relative(resolved, filePath);

    for (const nodeVersion of nodeVersions) {
      const meets = minimumRequired === '0.0.0' || semverMeetsMinimum(nodeVersion, minimumRequired);
      nodeVersionFindings.push({
        file: relPath,
        nodeVersion,
        meetsMinimum: meets,
        minimumRequired,
      });
    }
  }

  const hasConflict = nodeVersionFindings.some((f) => !f.meetsMinimum);

  return { configsFound, nodeVersionFindings, hasConflict };
}
