import dotenv from "dotenv";

import { z } from "zod";
import { getEnv } from "./utilities";

dotenv.config();

export const Environment = z.enum(["PRODUCTION", "DEVELOPMENT", "TESTING"]);

export const MailingListName = z.enum(["rp_interest"]);

export const Config = {
    DEFAULT_APP_PORT: 3000,
    ALLOWED_CORS_ORIGIN_PATTERNS: [
        new RegExp("(.*).reflectionsprojections.org(.*)"),
        new RegExp("deploy-preview-[0-9]*(--rp2024.netlify.app)(.*)"),
    ],

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

    S3_ACCESS_KEY: getEnv("S3_ACCESS_KEY"),
    S3_SECRET_KEY: getEnv("S3_SECRET_KEY"),
    S3_BUCKET_NAME: getEnv("S3_BUCKET_NAME"),
    S3_REGION: getEnv("S3_REGION"),
    MAX_RESUME_SIZE_BYTES: 6 * 1024 * 1024,
    RESUME_URL_EXPIRY_SECONDS: 60,

    // QR Scanning
    QR_HASH_ITERATIONS: 10000,
    QR_HASH_SECRET: getEnv("QR_HASH_SECRET"),
};

export const DeviceRedirects: Record<string, string> = {
    web: "http://localhost:5173/",
    dev: "https://api.reflectionsprojections.org/auth/dev/",
    mobile: "reflectionsprojections.org/"
};
