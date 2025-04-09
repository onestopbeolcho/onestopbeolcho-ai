module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: 'google',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': [
      'error',
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false,
      },
    ],
    'indent': ['error', 2],
  },
};
