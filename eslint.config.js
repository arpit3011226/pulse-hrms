import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // A leading underscore is how we say "deliberately unused" — a positional
      // argument we have to accept, or a destructured field we are dropping.
      // Anything without one is genuinely dead and should go.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],

      // react-hook-form's useForm() returns watch(), which the React Compiler
      // cannot memoize safely, so it reports every form in the app. It is a
      // property of the library, not of our code, and there is nothing to fix
      // short of replacing react-hook-form.
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    // shadcn primitives deliberately export their variant definitions beside the
    // component, which is the upstream convention. These are not screens being
    // hot-reloaded during development, so the fast-refresh rule adds nothing.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
