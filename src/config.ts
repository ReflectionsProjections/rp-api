import dotenv from "dotenv";

import { z } from "zod";
import { getEnv } from "./utilities";

dotenv.config();

export const Environment = z.enum(["PRODUCTION", "DEVELOPMENT", "TESTING"]);

export const Config = {
    DEFAULT_APP_PORT: 3000,
    ENV: Environment.parse(getEnv("ENV")),

    DATABASE_USERNAME: getEnv("DATABASE_USERNAME"),
    DATABASE_PASSWORD: getEnv("DATABASE_PASSWORD"),
    DATABASE_HOST: getEnv("DATABASE_HOST"),
};
