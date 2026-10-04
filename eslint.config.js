import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'animation/out/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Service worker template: the build substitutes the placeholder global.
    files: ['src/sw/sw.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.serviceworker, __PRECACHE__: 'readonly' },
    },
  },
  {
    files: ['*.config.{ts,js}', 'tests/**/*.ts', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Product film sources: classic browser scripts sharing the Motion global, and a Node render script.
    files: ['animation/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, Motion: 'writable' } },
  },
  {
    files: ['animation/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'animation/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    // Tests poke at malformed documents on purpose.
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
