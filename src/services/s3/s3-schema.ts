import { z } from "zod";
import { registry } from "../../middleware/openapi-registry";

const BatchResumeDownloadValidator = registry.register(
    "BatchResumeDownloadValidator",
    z
        .object({ userIds: z.string().array() })
        .openapi("BatchResumeDownloadValidator", {
            example: { userIds: ["user_abc123", "user_def456"] },
        })
);

export const S3UploadUrlResponse = registry.register(
    "S3UploadUrlResponse",
    z
        .object({
            url: z.string(),
            fields: z.record(z.string()),
        })
        .openapi("S3UploadUrlResponse", {
            description:
                "Presigned POST URL and required form fields for uploading a resume to S3.",
            example: {
                url: "https://s3.amazonaws.com/bucket-name",
                fields: {
                    "Content-Type": "application/pdf",
                    success_action_status: "201",
                    key: "user_abc123.pdf",
                    AWSAccessKeyId: "AKIA...",
                    policy: "eyJ...",
                    signature: "abc123==",
                },
            },
        })
);

export const S3DownloadUrlResponse = registry.register(
    "S3DownloadUrlResponse",
    z
        .object({ url: z.string() })
        .openapi("S3DownloadUrlResponse", {
            description: "Presigned GET URL for downloading a resume from S3.",
            example: {
                url: "https://s3.amazonaws.com/bucket-name/user_abc123.pdf?X-Amz-Signature=...",
            },
        })
);

export const S3BatchDownloadResponse = registry.register(
    "S3BatchDownloadResponse",
    z
        .object({
            data: z.array(z.string().nullable()),
            errorCount: z.number().int().min(0),
        })
        .openapi("S3BatchDownloadResponse", {
            description:
                "Presigned download URLs for a batch of users. Entries are null when no resume exists.",
            example: {
                data: [
                    "https://s3.amazonaws.com/bucket/user_abc123.pdf?X-Amz-Signature=...",
                    null,
                ],
                errorCount: 1,
            },
        })
);

export default BatchResumeDownloadValidator;
