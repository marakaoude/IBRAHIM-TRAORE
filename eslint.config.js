import js from '@eslint/js';
import globals from 'globals';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
