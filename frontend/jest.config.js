const { createCjsPreset } = require('jest-preset-angular/presets');

const esm = createCjsPreset();

module.exports = {
  ...esm,
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: [
    '<rootDir>/src/setup.jest.ts',
    'jest-canvas-mock'
  ],
  modulePaths: [
    '<rootDir>'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ],
  coveragePathIgnorePatterns: [
    '.html'
  ],
  globals: {
    ...esm.globals,
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.html$',
    }
  },
  testEnvironment: 'jsdom'
};