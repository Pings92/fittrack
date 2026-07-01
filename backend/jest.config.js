module.export = {
    testEnvironment: 'node',
    setupFiles: ['./test/setup.js'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'controllers/**/*.js',
        'middleware/**/*.js',
        'routes/**/*.js'
    ],
    testMatch: ['**/test/**/*.test.js'],
    verbose: true,
};