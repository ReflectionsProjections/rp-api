import { NextFunction, Request, Response } from "express";
import { SESClient } from "@aws-sdk/client-ses";
import { Config } from "../config";

export function sesClientMiddleware(
    _: Request,
    res: Response,
    next: NextFunction
): void {
    res.locals.sesClient = new SESClient({
        region: Config.S3_REGION,
        credentials: {
            accessKeyId: Config.S3_ACCESS_KEY,
            secretAccessKey: Config.S3_SECRET_KEY,
        },
    });

    return next();
}
