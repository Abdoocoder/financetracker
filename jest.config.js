/** @type {import('jest').Config} */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
    dir: './',
})

const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
    ],
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
        '<rootDir>/mobile/',
        '<rootDir>/__tests__/helpers/',
    ],
    collectCoverageFrom: [
        'lib/**/*.{js,ts,tsx}',
        'hooks/**/*.{js,ts,tsx}',
        'types/**/*.{js,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
    ],
}

module.exports = createJestConfig(customJestConfig)
