import { Request, Response, Router } from "express";
import RoleChecker from "../../middleware/role-checker";
import { s3ClientMiddleware } from "../../middleware/s3";
import { StatusCodes } from "http-status-codes";
import { Config } from "../../config";
import { Role } from "../auth/auth-models";

import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Router: Router = Router();

s3Router.get(
    "/upload/",
    RoleChecker([Role.enum.USER], false),
    s3ClientMiddleware,
    async (_req: Request, res: Response) => {
        const payload = res.locals.payload;

        const s3 = res.locals.s3 as S3;
        const userId: string = payload.userId;

        const { url, fields } = await createPresignedPost(s3, {
            Bucket: Config.S3_BUCKET_NAME,
            Key: `${userId}.pdf`,
            Conditions: [
                ["content-length-range", 0, Config.MAX_RESUME_SIZE_BYTES], // 6 MB max
            ],
            Fields: {
                success_action_status: "201",
                "Content-Type": "application/pdf",
            },
            Expires: Config.RESUME_URL_EXPIRY_SECONDS,
        });

        return res.status(StatusCodes.OK).send({ url: url, fields: fields });
    }
);

s3Router.get(
    "/download/",
    RoleChecker([Role.enum.USER], false),
    s3ClientMiddleware,
    async (_req: Request, res: Response) => {
        const payload = res.locals.payload;

        const s3 = res.locals.s3 as S3;
        const userId: string = payload.userId;

        const command = new GetObjectCommand({
            Bucket: Config.S3_BUCKET_NAME,
            Key: `${userId}.pdf`,
        });

        const downloadUrl = await getSignedUrl(s3, command, {
            expiresIn: Config.RESUME_URL_EXPIRY_SECONDS,
        });

        return res.status(StatusCodes.OK).send({ url: downloadUrl });
    }
);

s3Router.get(
    "/download/:USERID",
    RoleChecker([Role.enum.ADMIN], false),
    s3ClientMiddleware,
    async (req: Request, res: Response) => {
        const userId: string = req.params.USERID;
        const s3 = res.locals.s3 as S3;

        const command = new GetObjectCommand({
            Bucket: Config.S3_BUCKET_NAME,
            Key: `${userId}.pdf`,
        });

        const downloadUrl = await getSignedUrl(s3, command, {
            expiresIn: Config.RESUME_URL_EXPIRY_SECONDS,
        });

        return res.status(StatusCodes.OK).send({ url: downloadUrl });
    }
);

export default s3Router;
