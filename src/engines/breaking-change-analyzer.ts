import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UpgradePlan, CodeSuggestion, BreakingChange } from '../types/index.js';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.html', '.json'];
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', '.angular']);

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) walk(path.join(current, entry.name));
      } else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
        files.push(path.join(current, entry.name));
      }
    }
  }

  walk(dir);
  return files;
}

function searchFile(filePath: string, change: BreakingChange): CodeSuggestion[] {
  if (!change.searchPattern) return [];

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const suggestions: CodeSuggestion[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line?.includes(change.searchPattern)) {
      suggestions.push({
        file: filePath,
        line: i + 1,
        change,
        matchedText: line.trim(),
      });
    }
  }

  return suggestions;
}

export function analyzeBreakingChanges(projectPath: string, plan: UpgradePlan): CodeSuggestion[] {
  const allChanges = plan.steps.flatMap((s) => s.breakingChanges);
  const searchableChanges = allChanges.filter((c) => c.searchPattern);

  if (searchableChanges.length === 0) return [];

  const files = collectSourceFiles(projectPath);
  const suggestions: CodeSuggestion[] = [];

  for (const file of files) {
    for (const change of searchableChanges) {
      const found = searchFile(file, change);
      suggestions.push(...found);
    }
  }

  // Deduplicate: one suggestion per (file, line, api) triple
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = `${s.file}:${s.line}:${s.change.api}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
