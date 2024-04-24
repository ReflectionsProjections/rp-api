import mongoose from "mongoose";
import { Config, Environment } from "./config";

export async function connectToDatabase() {
    const url = getDatabaseUrl();
    console.log("URL", url);
    return mongoose.connect(url);
}

function getDatabaseUrl() {
    const username = Config.DATABASE_USERNAME;
    const password = Config.DATABASE_PASSWORD;
    const host = Config.DATABASE_HOST;
    let database;
    if (isProd()) {
        database = `prod`;
    } else if (isDev()) {
        database = `dev-${username}`;
    }

    return `mongodb+srv://${username}:${password}@${host}/${database}?retryWrites=true&w=majority&appName=rp-dev-cluster`;
}

export function isProd() {
    return Config.ENV == Environment.enum.PRODUCTION;
}

export function isDev() {
    return Config.ENV == Environment.enum.DEVELOPMENT;
}

export function getEnv(target: string) {
    if (process.env[target] === undefined) {
        throw new Error(`env value ${target} not found, exiting...`);
    }
    return process.env[target];
}
