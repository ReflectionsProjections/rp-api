import { afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as Config from "../src/config";
import mongoose from "mongoose";

function mockConfig(dbUrl: string) {
    jest.mock("../src/config.ts", () => {
        const actual = jest.requireActual("../src/config.ts") as typeof Config;

        const newConfig: typeof Config.default = {
            ...actual.default,
            DATABASE_HOST: dbUrl,
            ENV: "TESTING",
        };

        return {
            ...actual,
            default: newConfig,
            __esModule: true,
        };
    });
}

let mongod: MongoMemoryServer | undefined = undefined;

beforeAll(async () => {
    if (!mongod) {
        mongod = await MongoMemoryServer.create();
    }
    const uri = `${mongod.getUri()}`;
    if (mongoose.connections.length > 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(
        `${uri}?retryWrites=true&w=majority&appName=rp-dev-cluster`
    );
    mockConfig(`${uri}?retryWrites=true&w=majority&appName=rp-dev-cluster`);
});

afterEach(async () => {
    const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
    for (const collection of collections) {
        await mongoose.connection.db.collection(collection.name).deleteMany({});
    }
});

afterAll(async () => {
    for (const connection of mongoose.connections) {
        await connection.dropDatabase();
        await connection.destroy();
    }
    await mongoose.disconnect();
    if (mongod) {
        await mongod.stop();
    }
});
