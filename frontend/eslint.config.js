import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/gen']),
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
  },
  {
    files: [
      'src/components/ui/{badge,button,sidebar,tabs}.tsx',
      'src/lib/auth/AuthProvider.tsx',
      'src/lib/org-context.tsx',
      'src/lib/project-context.tsx',
      'src/routes/**/*.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: [
      'src/components/secret-data-editor.tsx',
      'src/components/secret-data-grid.tsx',
    ],
    rules: {
      'react-hooks/refs': 'off',
    },
  },
  {
    files: ['src/components/ui/sidebar.tsx'],
    rules: {
      'react-hooks/purity': 'off',
    },
  },
  {
    files: [
      'src/hooks/use-mobile.ts',
      'src/routes/_authenticated/profile.tsx',
      'src/routes/_authenticated/projects/$projectName/secrets/$name.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
