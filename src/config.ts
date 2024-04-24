import dotenv from "dotenv";

import { z } from "zod";
import { getEnv } from "./utilities";

dotenv.config();

export const Environment = z.enum(["PRODUCTION", "DEVELOPMENT", "TESTING"]);

export const MailingListName = z.enum(["rp_interest"]);

export const Config = {
    DEFAULT_APP_PORT: 3000,
    ENV: Environment.parse(getEnv("ENV")),

    DATABASE_USERNAME: getEnv("DATABASE_USERNAME"),
    DATABASE_PASSWORD: getEnv("DATABASE_PASSWORD"),
    DATABASE_HOST: getEnv("DATABASE_HOST"),

    CLIENT_ID: getEnv("OAUTH_GOOGLE_CLIENT_ID"),
    CLIENT_SECRET: getEnv("OAUTH_GOOGLE_CLIENT_SECRET"),

    // AUTH_CALLBACK_URI_BASE: "http://localhost:3000/auth/callback/",
    AUTH_CALLBACK_URI_BASE:
        "https://api.reflectionsprojections.org/auth/callback/",

    JWT_SIGNING_SECRET: getEnv("JWT_SIGNING_SECRET"),
    JWT_EXPIRATION_TIME: "1 day",
};

export const DeviceRedirects: Record<string, string> = {
    web: "https://www.google.com/",
    dev: "https://api.reflectionsprojections.org/auth/dev/",
};
