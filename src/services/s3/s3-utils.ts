import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";
import Config from "../../config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export async function postResumeUrl(userId: string, client: S3) {
    const { url, fields } = await createPresignedPost(client, {
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

    return { url, fields };
}

export async function getResumeUrl(userId: string, client: S3) {
    const command = new GetObjectCommand({
        Bucket: Config.S3_BUCKET_NAME,
        Key: `${userId}.pdf`,
    });

    return getSignedUrl(client, command, {
        expiresIn: Config.RESUME_URL_EXPIRY_SECONDS,
    });
}
