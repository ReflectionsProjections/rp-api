import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";
import { getEnv } from "./utilities";

export const Environment = z.enum(["PRODUCTION", "DEVELOPMENT", "TESTING"]);

export const Config = {
    DEFAULT_APP_PORT: 3000,
    ENV: Environment.parse(getEnv("ENV")),

    DATABASE_USERNAME: getEnv("DATABASE_USERNAME"),
    DATABASE_PASSWORD: getEnv("DATABASE_PASSWORD"),
    DATABASE_HOST: getEnv("DATABASE_HOST"),

    CLIENT_ID: getEnv("OAUTH_GOOGLE_CLIENT_ID"),
    CLIENT_SECRET: getEnv("OAUTH_GOOGLE_CLIENT_SECRET"),

    REDIRECT_URI: "http://localhost:3000/auth/callback",
};
