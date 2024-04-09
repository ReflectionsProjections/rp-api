import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";
import { getEnv } from "./utilities";

export const Environment = z.enum(["PRODUCTION", "DEVELOPMENT", "TESTING"]);

export const ListName = z.enum(["RP_INTEREST"]);

export const Config = {
    DEFAULT_APP_PORT: 3000,
    ENV: Environment.parse(getEnv("ENV")),

    DATABASE_USERNAME: getEnv("DATABASE_USERNAME"),
    DATABASE_PASSWORD: getEnv("DATABASE_PASSWORD"),
    DATABASE_HOST: getEnv("DATABASE_HOST"),
};
