import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.{js,mjs,ts}'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // Ambient type declarations: namespace/global tokens read as unused
  {
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  // Frontend: React + browser
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Backend: Node
  {
    files: ['backend/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
)
