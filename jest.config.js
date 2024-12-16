/** @type {import('jest').Config} */
const config = {
  modulePaths: [
      "<rootDir>/frontend",
      "<rootDir>/backend"
    ],
    testPathIgnorePatterns: [
      "<rootDir>/frontend/node_modules/",
      "<rootDir>/frontend/dist/",
      "<rootDir>/backend/node_modules/",
      "<rootDir>/backend/dist/"
    ]
};

module.exports = config;
