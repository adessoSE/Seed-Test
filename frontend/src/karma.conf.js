// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    files: [
      {pattern: './app/**/*.ts', included: true},
      {pattern: '**/*.ts', included: true}
    ],
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
      require('karma-coverage'),
      require('karma-sonarqube-unit-reporter'),
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },

    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reports: ['html', 'lcovonly'],
      fixWebpackSourcePaths: true
    },
    coverageReporter: {
      type: 'lcov',
      dir: 'reports',
      subdir: '../reports',
    },
    reporters: ['progress', 'kjhtml', 'sonarqubeUnit', 'coverage'],

    preprocessors: {
      'src/**/*.js': ['coverage'],
      'test/**/*.js': ['coverage'],
    },
    sonarQubeUnitReporter: {
      sonarQubeVersion: 'LATEST',
      outputFile: 'reports/ut_report.xml',
      useBrowserName: false,
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false
  });
};
