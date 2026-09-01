/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    './base.js',
  ],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/react-in-jsx-scope': 'off',
  },
};
