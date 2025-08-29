import * as crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Config from "../config";

const EXPECTED_HASH = crypto
    .createHash("sha256")
    .update(Config.PUZZLEBANG_API_KEY, "utf8")
    .digest("hex");

export default function PuzzlebangChecker(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const apiKey = req.headers.authorization;

    if (!apiKey) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ error: "NoKey" });
    }

    const hashedApiKey = crypto
        .createHash("sha256")
        .update(apiKey, "utf8")
        .digest("hex");

    if (hashedApiKey != EXPECTED_HASH) {
        return res
            .status(StatusCodes.UNAUTHORIZED)
            .json({ error: "InvalidKey" });
    }

    return next();
}
