export type SkillSourceType = 'bundled' | 'npm' | 'github';

export interface SkillEntry {
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  source: {
    type: SkillSourceType;
    bundledPath?: string;
    npmPackage?: string;
    github?: string;
    githubPath?: string;
  };
}

export const SKILL_REGISTRY: Record<string, SkillEntry> = {
  stacklift: {
    name: 'stacklift',
    description: 'AI-powered frontend upgrade assistant for Angular, React, and TypeScript projects',
    version: '1.0.0',
    author: 'gorde-ganesh',
    tags: ['angular', 'react', 'typescript', 'upgrade', 'migration'],
    source: {
      type: 'bundled',
      bundledPath: 'skills/stacklift',
    },
  },
};
