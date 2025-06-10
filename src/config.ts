import dotenv from "dotenv";

import { z } from "zod";
import { getEnv } from "./utilities";

import AWS from "aws-sdk";

dotenv.config();

export enum EnvironmentEnum {
    PRODUCTION = "PRODUCTION",
    DEVELOPMENT = "DEVELOPMENT",
    TESTING = "TESTING",
}

export const Environment = z.nativeEnum(EnvironmentEnum);

export const MailingListName = z.enum(["rp_interest"]);

const env = Environment.parse(getEnv("ENV"));
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

    AUTH_CALLBACK_URI_BASE: `${API_BASE}/auth/callback/`,

    // prettier-ignore
    AUTH_ADMIN_WHITELIST: new Set([
        // Dev Chairs/Code-Owners (reach out to these people for questions)
        "apirani2@illinois.edu",    // Aydan Pirani
        "divyack2@illinois.edu",    // Divya Koya

        // Directors
        "ojaswee2@illinois.edu",     // Ojaswee Chaudhary
        "ritikav2@illinois.edu",     // Ritika Vithani

        // Committee Chairs
        "adit3@illinois.edu",       // Adit Shah (Ops)
        "arpitb2@illinois.edu",     // Arpit Bansal (Ops)
        "mauskar3@illinois.edu",    // Aashna Mauskar (Marketing)
        "coleej2@illinois.edu",     // Cole Jordan (Marketing)
        "divyam4@illinois.edu",     // Divya Machineni (Corp)
        "nzhan2@illinois.edu",      // Nancy Zhang (Design)
        "preetig3@illinois.edu",    // Preethi Gomathinayagam (Content)
        "snall6@illinois.edu",      // Sailaja Nallacheruvu (Corp)
        "sahanah2@illinois.edu",    // Sahana Hariharan (Design)
        "yosheej2@illinois.edu",    // Yoshee Jain (Content)

        // Dev Team
        "abahl3@illinois.edu",      // Aryan Bahl
        "aryanb3@illinois.edu",     // Aryan Bhardwaj
        "alexy3@illinois.edu",      // Alex Yang
        "devrp3@illinois.edu",      // Dev Patel
        "jechang3@illinois.edu",    // Jacob Chang
        "jeremy19@illinois.edu",    // Jeremy Wu
        "manyad2@illinois.edu",     // Manya Dua
        "riyakp2@illinois.edu",     // Riya Patel
        "ronita2@illinois.edu",     // Ronit Anandani
        "srd8@illinois.edu",        // Shreenija Daggavolu
    ]),

    JWT_SIGNING_SECRET: getEnv("JWT_SIGNING_SECRET"),
    JWT_EXPIRATION_TIME: "1 day",
    PB_JWT_EXPIRATION_TIME: "1 week",
    STAFF_MEETING_CHECK_IN_WINDOW_SECONDS: 6 * 60 * 60,

    S3_ACCESS_KEY: getEnv("S3_ACCESS_KEY"),
    S3_SECRET_KEY: getEnv("S3_SECRET_KEY"),
    S3_BUCKET_NAME: getEnv("S3_BUCKET_NAME"),
    S3_REGION: getEnv("S3_REGION"),
    MAX_RESUME_SIZE_BYTES: 6 * 1024 * 1024,
    RESUME_URL_EXPIRY_SECONDS: 60,

    HASH_SALT_ROUNDS: 10,
    VERIFY_EXP_TIME_MS: 300,
    SPONSOR_ENTIRES_PER_PAGE: 60,

    // QR Scanning
    QR_HASH_ITERATIONS: 10000,
    QR_HASH_SECRET: getEnv("QR_HASH_SECRET"),
    USERID_ENCRYPTION_KEY: getEnv("USERID_ENCRYPTION_KEY"),
    API_RESUME_UPDATE_ROUTE: `${API_BASE}/attendee/resume/update/`,
    WEB_RESUME_REUPLOAD_ROUTE: `${WEB_BASE}/update`,
    OUTGOING_EMAIL_ADDRESSES: z.enum(["no-reply@reflectionsprojections.org"]),
};

export const ses = new AWS.SES({
    region: Config.S3_REGION,
    accessKeyId: Config.S3_ACCESS_KEY,
    secretAccessKey: Config.S3_SECRET_KEY,
});

export default Config;
