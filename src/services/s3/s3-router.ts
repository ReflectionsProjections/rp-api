import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import RoleChecker from "../../middleware/role-checker";
import { s3ClientMiddleware } from "../../middleware/s3";
import { Role } from "../auth/auth-models";

import { S3 } from "@aws-sdk/client-s3";
import { getResumeUrl, postResumeUrl } from "./s3-utils";
import BatchResumeDownloadValidator from "./s3-schema";

const s3Router: Router = Router();

s3Router.get(
    "/upload/",
    RoleChecker([], false),
    s3ClientMiddleware,
    async (_req, res, next) => {
        const payload = res.locals.payload;

        const s3 = res.locals.s3 as S3;
        const userId: string = payload.userId;

        try {
            const { url, fields } = await postResumeUrl(userId, s3);
            return res.status(StatusCodes.OK).send({ url, fields });
        } catch (error) {
            next(error);
        }
    }
);

s3Router.get(
    "/download/",
    RoleChecker([Role.Enum.USER], false),
    s3ClientMiddleware,
    async (_, res, next) => {
        const payload = res.locals.payload;
        const userId = payload.userId;

        const s3 = res.locals.s3 as S3;

        try {
            const downloadUrl = await getResumeUrl(userId, s3);
            return res.status(StatusCodes.OK).send({ url: downloadUrl });
        } catch (error) {
            next(error);
        }
    }
);

s3Router.get(
    "/download/user/:USERID",
    RoleChecker([Role.Enum.STAFF, Role.Enum.CORPORATE], false),
    s3ClientMiddleware,
    async (req, res, next) => {
        const userId = req.params.USERID;
        const s3 = res.locals.s3 as S3;

        try {
            const downloadUrl = await getResumeUrl(userId, s3);
            return res.status(StatusCodes.OK).send({ url: downloadUrl });
        } catch (error) {
            next(error);
        }
    }
);

s3Router.get(
    "/download/batch/:USERID",
    RoleChecker([Role.Enum.STAFF, Role.Enum.CORPORATE], false),
    s3ClientMiddleware,
    async (req, res, next) => {
        const s3 = res.locals.s3 as S3;

        try {
            const { userIds } = BatchResumeDownloadValidator.parse(req.body);

            const batchDownloadPromises = userIds.map((userId) =>
                getResumeUrl(userId, s3)
            );
            
            const batchDownloadUrls = await Promise.allSettled(
                batchDownloadPromises
            );

            const filteredUrls = batchDownloadUrls.forEach((result) => {
                if (result.status === "fulfilled") {
                    return result.value;
                }
            });

            return res.status(StatusCodes.OK).send({ url: filteredUrls });
        } catch (error) {
            next(error);
        }
    }
);

export default s3Router;
