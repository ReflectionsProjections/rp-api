//https://jestjs.io/docs/configuration

import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",

    rootDir: "../src",

    setupFiles: ["../testing/jest.env-setup.ts"],
    // setupFilesAfterEnv: ["../testing/jest.db-setup.ts"],
    setupFilesAfterEnv: ["../testing/jest.supabase-db.setup.ts"],


    testPathIgnorePatterns: [
        "/app.ts", // Ignore app.ts
    ],

    verbose: true,
};

export default config;
