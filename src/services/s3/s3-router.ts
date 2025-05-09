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
    async (req, res) => {
        const payload = res.locals.payload;

        const s3 = res.locals.s3 as S3;
        const userId: string = payload.userId;

        const { url, fields } = await postResumeUrl(userId, s3);
        return res.status(StatusCodes.OK).send({ url, fields });
    }
);

s3Router.get(
    "/download/",
    RoleChecker([Role.Enum.USER], false),
    s3ClientMiddleware,
    async (req, res) => {
        const payload = res.locals.payload;
        const userId = payload.userId;

        const s3 = res.locals.s3 as S3;

        const downloadUrl = await getResumeUrl(userId, s3);
        return res.status(StatusCodes.OK).send({ url: downloadUrl });
    }
);

s3Router.get(
    "/download/user/:USERID",
    RoleChecker([Role.Enum.STAFF, Role.Enum.CORPORATE], false),
    s3ClientMiddleware,
    async (req, res) => {
        const userId = req.params.USERID;
        const s3 = res.locals.s3 as S3;

        const downloadUrl = await getResumeUrl(userId, s3);
        return res.status(StatusCodes.OK).send({ url: downloadUrl });
    }
);

s3Router.post(
    "/download/batch/",
    RoleChecker([Role.Enum.STAFF, Role.Enum.CORPORATE], false),
    s3ClientMiddleware,
    async (req, res) => {
        const s3 = res.locals.s3 as S3;

        const { userIds } = BatchResumeDownloadValidator.parse(req.body);

        const batchDownloadPromises = userIds.map((userId) =>
            getResumeUrl(userId, s3)
                .then((url) => ({ userId, url: url }))
                .catch(() => ({ userId, url: null }))
        );

        const batchDownloadResults = await Promise.allSettled(
            batchDownloadPromises
        );

        batchDownloadPromises.forEach((bdp) => console.log(bdp));

        const filteredUrls = batchDownloadResults
            .filter((result) => result.status === "fulfilled")
            .map((result) => {
                return (
                    result as PromiseFulfilledResult<{
                        userId: string;
                        url: string | null;
                    }>
                ).value.url;
            });

        const errors = batchDownloadResults.filter(
            (result) => result.status === "rejected"
        ).length;

        return res
            .status(StatusCodes.OK)
            .send({ data: filteredUrls, errorCount: errors });
    }
);

export default s3Router;
