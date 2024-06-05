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

    AUTH_CALLBACK_URI_BASE:
        // "http://localhost:3000/auth/callback/",
        "https://api.reflectionsprojections.org/auth/callback/",

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
    mobile: "https://www.reflectionsprojections.org/",
};
