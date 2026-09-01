/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['@ecommerce/eslint-config'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/packages/database/src/generated/**',
  ],
};
