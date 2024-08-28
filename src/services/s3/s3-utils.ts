import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";
import { Config, BucketName } from "../../config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export async function postUrl(
    userId: string,
    client: S3,
    bucketName: BucketName
) {
    const { url, fields } = await createPresignedPost(client, {
        Bucket: bucketName as string,
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

export async function getUrl(
    userId: string,
    client: S3,
    bucketName: BucketName
) {
    const command = new GetObjectCommand({
        Bucket: bucketName as string,
        Key: `${userId}.pdf`,
    });

    return getSignedUrl(client, command, {
        expiresIn: Config.RESUME_URL_EXPIRY_SECONDS,
    });
}
