import type { Config } from 'jest';

const config: Config = {
    moduleFileExtensions: [
        'js',
        'json',
        'ts'
    ],

    rootDir: '.',

    testRegex: '(src|test)/.*\\.spec\\.ts$',

    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    transformIgnorePatterns: [
        'node_modules/(?!(?:\\.pnpm/|@nestjs/config/|@nestjs/jwt/|es-toolkit/))'
    ],

    transform: {
        '^.+\\.(t|j)s$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.spec.json'
            }
        ]
    },

    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/*.enum.ts'
    ],

    coverageDirectory: 'coverage',

    testEnvironment: 'node',

    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};

export default config;