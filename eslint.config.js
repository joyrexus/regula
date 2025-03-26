import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    files: ['**/*.ts'],
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-interface': 'warn',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);