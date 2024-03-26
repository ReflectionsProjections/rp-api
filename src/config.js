"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.Environment = void 0;
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var zod_1 = require("zod");
var utilities_1 = require("./utilities");
exports.Environment = zod_1.z.enum(["PRODUCTION", "DEVELOPMENT", "TESTING"]);
exports.Config = {
    DEFAULT_APP_PORT: 3000,
    ENV: exports.Environment.parse((0, utilities_1.getEnv)("ENV")),
    DATABASE_USERNAME: (0, utilities_1.getEnv)("DATABASE_USERNAME"),
    DATABASE_PASSWORD: (0, utilities_1.getEnv)("DATABASE_PASSWORD"),
    DATABASE_HOST: (0, utilities_1.getEnv)("DATABASE_HOST"),
};
