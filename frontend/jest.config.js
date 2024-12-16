/** @type {import('ts-jest').JestConfigWithTsJest} * */
module.exports = {
	transform: {
		'^.+.tsx?$': ['ts-jest', {}]
	},
	preset: "jest-preset-angular",
    setupFilesAfterEnv: [
        "<rootDir>/src/setup.jest.ts",
		"jest-canvas-mock"
      ],
 	modulePaths: [
        "<rootDir>"
      ],
      testPathIgnorePatterns: [
        "<rootDir>/node_modules/",
        "<rootDir>/dist/"
      ],
      coveragePathIgnorePatterns: [
        ".html"
      ],
      "ts-jest": {
        "tsconfig": "<rootDir>/tsconfig.spec.json",
        "stringifyContentPathRegex": "\\.html$"
      }  
};
