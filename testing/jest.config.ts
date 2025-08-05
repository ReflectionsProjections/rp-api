//https://jestjs.io/docs/configuration

import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",

    rootDir: "../src",

    testTimeout: 30_000,

    // Setup files
    setupFiles: ["../testing/jest.env-setup.ts"],
    setupFilesAfterEnv: [
        "../testing/jest.db-setup.ts",
        "../testing/jest.supabase-db.setup.ts",
    ],

    testPathIgnorePatterns: [
        "/app.ts", // Ignore app.ts
    ],

    verbose: true,
    detectOpenHandles: true,

    // Enable parallel test execution
    maxWorkers: "50%",

    // Coverage settings
    collectCoverageFrom: [
        "**/*.ts",
        "!**/*.d.ts",
        "!**/*.test.ts",
        "!**/*.spec.ts",
    ],
};

export default config;
