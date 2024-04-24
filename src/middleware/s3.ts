import { NextFunction, Request, Response } from "express";
import { S3 } from "@aws-sdk/client-s3";
import { Config } from "../config";

export function s3ClientMiddleware(
    _: Request,
    res: Response,
    next: NextFunction
): void {
    res.locals.s3 = new S3({
        apiVersion: "2006-03-01",
        credentials: {
            accessKeyId: Config.S3_ACCESS_KEY,
            secretAccessKey: Config.S3_SECRET_KEY,
        },
        region: Config.S3_REGION,
    });

    return next();
}
