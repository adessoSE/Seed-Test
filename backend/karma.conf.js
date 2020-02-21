// Karma configuration
// Generated on Fri Dec 20 2019 14:30:54 GMT+0100 (GMT+01:00)
module.exports = function(config) {
  config.set({
    files: [
      { pattern: './spec/*spec.js', included: true },
    ],
    basePath: './',
    exclude: [
    ],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      require('karma-coverage'),
      require('karma-sonarqube-unit-reporter'),
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reports: ['html', 'lcovonly'],
      fixWebpackSourcePaths: true,
    },
    coverageReporter: {
      type: 'lcov',
      dir: 'reports',
      subdir: 'coverage',
    },
    reporters: ['progress', 'kjhtml', 'sonarqubeUnit', 'coverage'],

    sonarQubeUnitReporter: {
      sonarQubeVersion: 'LATEST',
      outputFile: 'reports/ut_report.xml',
      useBrowserName: false,
    },
    frameworks: ['jasmine'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    concurrency: Infinity,
  });
};
