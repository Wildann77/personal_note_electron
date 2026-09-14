import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.vite/**',
      '**/out/**',
      '**/dist/**',
      '**/*.json',
      'package-lock.json',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Renderer Process (React, Hooks, and Boundary Rules)
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'fs',
                'fs/*',
                'node:fs',
                'node:fs/*',
                'path',
                'path/*',
                'node:path',
                'node:path/*',
                'child_process',
                'node:child_process',
                'electron',
                'electron/*',
              ],
              message:
                'Dilarang mengimpor modul Node.js atau Electron langsung di Renderer (AGENTS.md §4 & §10). Gunakan IPC bridge via preload.',
            },
          ],
        },
      ],
    },
  },
  // Domain Layer Boundaries (Clean Architecture)
  {
    files: ['src/main/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'electron',
                'electron/*',
                'better-sqlite3',
                'better-sqlite3/*',
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'fs',
                'node:fs',
              ],
              message:
                'Domain layer dilarang mengimpor Electron, SQLite, React, atau Node FS (AGENTS.md §4).',
            },
          ],
        },
      ],
    },
  },
  // Shared Layer Boundaries (Clean Architecture)
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'electron',
                'electron/*',
                'better-sqlite3',
                'better-sqlite3/*',
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'fs',
                'node:fs',
              ],
              message:
                'Shared layer dilarang mengimpor Electron, SQLite, atau React (AGENTS.md §4).',
            },
          ],
        },
      ],
    },
  },
  // Disable type-checked rules on pure JS/MJS config files
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Prettier config to turn off conflicting styling rules
  prettierConfig,
);
