module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  extends: ['airbnb-base', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': ['error'],
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
    'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
    'no-continue': 0,
    curly: ['error', 'all'],
    'object-shorthand': 'error',
    'prefer-destructuring': ['warn', { object: true, array: false }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      env: { jest: true },
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }]
      }
    }
  ],
  settings: {
    'import/resolver': {
      node: {
        paths: ['src']
      }
    }
  }
};
