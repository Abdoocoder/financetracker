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
        '^@/lib/byok/crypto-utils$': '<rootDir>/lib/byok/crypto-utils.ts',
        '^@/lib/byok/(.*)\\.js$': '<rootDir>/lib/byok/$1.ts',
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
        '<rootDir>/e2e/',
    ],
    modulePathIgnorePatterns: [
        '<rootDir>/brag-output/',
        '<rootDir>/brag-output-2026-09-17-134500/',
    ],
    collectCoverageFrom: [
        'app/**/*.{js,ts,tsx}',
        'lib/**/*.{js,ts,tsx}',
        'hooks/**/*.{js,ts,tsx}',
        'types/**/*.{js,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
    ],
}

module.exports = createJestConfig(customJestConfig)
