import cors from "cors";
import { Config } from "../config";

const allowedOrigins = Config.ALLOWED_CORS_ORIGIN_PATTERNS;

function matchesRegex(target: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern: RegExp) => pattern.test(target));
}

const customCors = cors({
    origin: function (origin, callback) {
        if (!origin || matchesRegex(origin, allowedOrigins)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
});

export default customCors;
