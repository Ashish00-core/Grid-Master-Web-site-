import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Flat ESLint configuration (ESLint 9) for the whole repository: the React app
 * in src/, the optional serverless endpoints and the Node test suite.
 */
export default [
  { ignores: ['dist/**', 'node_modules/**', 'make_svgs.py'] },

  // 1. React application (browser)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Marks JSX element names as used so unused imports are actually caught.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
      // `React` is allowed to stay imported (explicit convention of this repo);
      // every other unused variable/import is a real error.
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$|^_', argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // 2. Serverless endpoints + tests (Node)
  {
    files: ['server/**/*.mjs', 'netlify/**/*.mjs', 'api/**/*.js', 'tests/**/*.{js,mjs,jsx}', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react },
    rules: {
      ...js.configs.recommended.rules,
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
];
