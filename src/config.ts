import dotenv from "dotenv";

import { z } from "zod";

import { SES } from "@aws-sdk/client-ses";

dotenv.config();

export enum EnvironmentEnum {
    PRODUCTION = "PRODUCTION",
    DEVELOPMENT = "DEVELOPMENT",
    TESTING = "TESTING",
    GITHUB_CI = "GITHUB_CI",
}

export const Environment = z.nativeEnum(EnvironmentEnum);

export const MailingListName = z.enum(["rp_interest"]);
const env = Environment.parse(getEnv("ENV"));

function getEnv(key: string): string {
    const val = process.env[key];
    if (val === undefined) {
        if (env == EnvironmentEnum.PRODUCTION) {
            console.warn(
                `env value ${key} not found, defaulting to empty string`
            );
            return "";
        }

        throw new Error(`env value ${key} not found, exiting...`);
    }
    return val;
}

const API_BASE =
    env === EnvironmentEnum.PRODUCTION
        ? "https://api.reflectionsprojections.org"
        : "http://localhost:3000";
const WEB_BASE =
    env === EnvironmentEnum.PRODUCTION
        ? "https://reflectionsprojections.org"
        : "http://localhost:3001";

export const Config = {
    ENV: env,
    DEFAULT_APP_PORT: 3000,
    ALLOWED_CORS_ORIGIN_PATTERNS: [
        new RegExp("(.*).reflectionsprojections.org(.*)"),
        new RegExp("deploy-preview-[0-9]*(--rp2024.netlify.app)(.*)"),
        new RegExp("(.*)localhost(.*)"),
        new RegExp("(.*)127.0.0.1(.*)"),
    ],

    DATABASE_USERNAME: getEnv("DATABASE_USERNAME"),
    DATABASE_PASSWORD: getEnv("DATABASE_PASSWORD"),
    DATABASE_HOST: getEnv("DATABASE_HOST"),

    CLIENT_ID: getEnv("OAUTH_GOOGLE_CLIENT_ID"),
    CLIENT_SECRET: getEnv("OAUTH_GOOGLE_CLIENT_SECRET"),
    IOS_CLIENT_ID: getEnv("IOS_OAUTH_GOOGLE_CLIENT_ID"),
    ANDROID_CLIENT_ID: getEnv("ANDROID_OAUTH_GOOGLE_CLIENT_ID"),
    AUTH_CALLBACK_URI_BASE: `${API_BASE}/auth/callback/`,

    FIREBASE_ADMIN_CERT_PATH: getEnv("FIREBASE_ADMIN_CERT_PATH"),

    PUZZLEBANG_API_KEY: getEnv("PUZZLEBANG_API_KEY"),
    PUZZLEBANG_POINTS: [
        {
            idRegex: /.*/,
            points: 2,
        },
        {
            idRegex: /^M.*/,
            points: 4,
        },
    ],

    // prettier-ignore
    AUTH_ADMIN_WHITELIST: new Set([
        // Dev Chairs/Code-Owners (reach out to these people for questions)
        "ronita2@illinois.edu",    // Ronit Anandani
        "abahl3@illinois.edu",    // Aryan Bahl
    ]),

    // For sending emails
    FROM_EMAIL_ADDRESS: process.env.FROM_EMAIL_ADDRESS,

    // Development admin email - allows developer email to be admin in development
    DEV_ADMIN_EMAIL: process.env.DEV_ADMIN_EMAIL,

    // Event date override for testing - allows overriding the hardcoded event start date
    EVENT_START_DATE_OVERRIDE: process.env.EVENT_START_DATE_OVERRIDE,

    JWT_SIGNING_SECRET: getEnv("JWT_SIGNING_SECRET"),
    JWT_EXPIRATION_TIME: "1 day" as const,
    MOBILE_JWT_EXPIRATION_TIME: "10 days" as const,
    STAFF_MEETING_CHECK_IN_WINDOW_SECONDS: 6 * 60 * 60,

    S3_ACCESS_KEY: getEnv("S3_ACCESS_KEY"),
    S3_SECRET_KEY: getEnv("S3_SECRET_KEY"),
    S3_BUCKET_NAME: getEnv("S3_BUCKET_NAME"),
    S3_REGION: getEnv("S3_REGION"),
    MAX_RESUME_SIZE_BYTES: 6 * 1024 * 1024,
    RESUME_URL_EXPIRY_SECONDS: 60,

    HASH_SALT_ROUNDS: 10,
    VERIFY_EXP_TIME_MS: 10 * 60 * 1000,
    SPONSOR_ENTIRES_PER_PAGE: 60,

    // QR Scanning
    QR_HASH_ITERATIONS: 10000,
    QR_HASH_SECRET: getEnv("QR_HASH_SECRET"),
    WEB_REGISTER_ROUTE: `${WEB_BASE}/register`,
    WEB_RESUME_ROUTE: `${WEB_BASE}/resume`,
    EMAIL_HEADER_HREF: `${WEB_BASE}/email_header.png`,
    OUTGOING_EMAIL_ADDRESSES: z.enum(["no-reply@reflectionsprojections.org"]),
    LOG_DIR:
        env === EnvironmentEnum.PRODUCTION ? "/home/ubuntu/logs" : "./logs",
};

export const ses = new SES({
    region: Config.S3_REGION,

    credentials: {
        accessKeyId: Config.S3_ACCESS_KEY,
        secretAccessKey: Config.S3_SECRET_KEY,
    },
});

export default Config;
