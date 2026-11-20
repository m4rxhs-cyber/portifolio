import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({ baseDirectory: fileURLToPath(new URL('.', import.meta.url)) });

const config = [
  { ignores: ['.next/**', '.next-v2/**', 'next-env.d.ts', 'cypress/screenshots/**', 'cypress/videos/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { files: ['cypress/**/*.js'], languageOptions: { globals: { cy: 'readonly', Cypress: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly' } } },
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
];

export default config;
