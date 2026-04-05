import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import RoleChecker from "../../middleware/role-checker";
import { s3ClientMiddleware } from "../../middleware/s3";
import { Role } from "../auth/auth-models";

import { S3 } from "@aws-sdk/client-s3";
import { getResumeUrl, postResumeUrl } from "./s3-utils";
import BatchResumeDownloadValidator from "./s3-schema";

const s3Router: Router = Router();

/**
 * @swagger
 * /s3/upload/:
 *   get:
 *     summary: Get a presigned URL for resume upload
 *     description: |
 *       Returns an S3 presigned POST URL and the required form fields so the
 *       client can upload a PDF resume directly to S3 without routing through
 *       the API server.
 *
 *       **Required roles: (any authenticated user)**
 *     tags: [S3]
 *     responses:
 *       200:
 *         description: Presigned POST URL and form fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3UploadUrlResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /s3/download/:
 *   get:
 *     summary: Get a presigned URL to download own resume
 *     description: |
 *       Returns a presigned GET URL for the authenticated user's own resume.
 *
 *       **Required roles: USER**
 *     tags: [S3]
 *     responses:
 *       200:
 *         description: Presigned download URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3DownloadUrlResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /s3/download/user/{USERID}:
 *   get:
 *     summary: Get a presigned URL to download another user's resume
 *     description: |
 *       Returns a presigned GET URL for the specified user's resume.
 *
 *       **Required roles: STAFF | CORPORATE**
 *     tags: [S3]
 *     parameters:
 *       - name: USERID
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Presigned download URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3DownloadUrlResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /s3/download/batch/:
 *   post:
 *     summary: Get presigned download URLs for multiple users
 *     description: |
 *       Returns presigned GET URLs for a list of user IDs. Entries are `null`
 *       when no resume exists for a given user.
 *
 *       **Required roles: STAFF | CORPORATE**
 *     tags: [S3]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchResumeDownloadValidator'
 *     responses:
 *       200:
 *         description: Batch of presigned download URLs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/S3BatchDownloadResponse'
 *     security:
 *       - bearerAuth: []
 */
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
