module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint',
    'import'
  ],
  rules: {
    // Code Quality Rules
    'no-console': ['warn', { 
      allow: ['warn', 'error', 'info'] 
    }],
    'no-debugger': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    
    // Import Rules
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    'import/no-unresolved': 'off', // Handled by TypeScript
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'error',
    
    // Modern JavaScript Rules
    'object-shorthand': 'error',
    'template-curly-spacing': 'error',
    'computed-property-spacing': 'error',
    'array-bracket-spacing': 'error',
    'object-curly-spacing': ['error', 'always'],
    
    // Async/Await Rules
    'require-await': 'error',
    'no-return-await': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Error Handling Rules
    'no-throw-literal': 'error',
    'no-undef': 'error',
    
    // TypeScript Specific Rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    
    // Function Rules
    'max-params': ['error', 4],
    'max-lines-per-function': ['warn', { 
      max: 100, 
      skipBlankLines: true, 
      skipComments: true 
    }],
    
    // Class Rules
    'class-methods-use-this': 'off',
    'lines-between-class-members': ['error', 'always', { 
      exceptAfterSingleLine: true 
    }],
    
    // Naming Conventions
    'camelcase': ['error', { 
      properties: 'never',
      ignoreDestructuring: true 
    }],
    
    // Documentation Rules
    'valid-jsdoc': 'off', // Using TypeScript instead
    'require-jsdoc': 'off'
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      files: ['main.js', 'preload.js'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off'
      }
    },
    {
      files: ['src/**/*.js'],
      env: {
        browser: true,
        node: false
      },
      parserOptions: {
        sourceType: 'module'
      }
    },
    {
      files: ['vite.config.js', '*.config.js'],
      env: {
        node: true
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-extraneous-dependencies': 'off'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'build/',
    'release/',
    'node_modules/',
    '*.min.js',
    'coverage/',
    '.nyc_output/'
  ],
  globals: {
    // Electron globals
    electronAPI: 'readonly',
    api: 'readonly',
    
    // Build-time globals
    __APP_VERSION__: 'readonly',
    __BUILD_TIME__: 'readonly',
    __DEV__: 'readonly'
  }
};