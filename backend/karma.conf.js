// Karma configuration
// Generated on Fri Dec 20 2019 14:30:54 GMT+0100 (GMT+01:00)
module.exports = function(config) {
  config.set({
    files: [
      {pattern: './spec/*spec.js', included: true},
    ],
    basePath: './',
    exclude: [
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reports: ['html', 'lcovonly'],
      fixWebpackSourcePaths: true
    },
    frameworks: ['jasmine'],
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    concurrency: Infinity
  })
}
