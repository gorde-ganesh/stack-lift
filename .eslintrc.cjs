/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    // Disallow implicit any
    '@typescript-eslint/no-explicit-any': 'error',
    // Require explicit return types on exported functions
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // Prefer const assertions
    'prefer-const': 'error',
    // No unused vars (TypeScript version handles generics correctly)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // No floating promises
    '@typescript-eslint/no-floating-promises': 'error',
    // Consistent type assertions
    '@typescript-eslint/consistent-type-assertions': 'error',
    // Disallow non-null assertion operator where possible
    '@typescript-eslint/no-non-null-assertion': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.cjs', 'vitest.config.ts', 'tsup.config.ts'],
};
