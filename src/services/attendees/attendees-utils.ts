import crypto from "crypto";
import { Config } from "../../config";

export function generateQrHash(userId: string, expTime: number) {
    let hashStr = userId + "#" + expTime;
    const hashIterations = Config.QR_HASH_ITERATIONS;
    const hashSecret = Config.QR_HASH_SECRET;

    const hmac = crypto.createHmac("sha256", hashSecret);
    hashStr = hmac.update(hashStr).digest("hex");

    for (let i = 0; i < hashIterations; i++) {
        const hash = crypto.createHash("sha256");
        hashStr = hash.update(hashSecret + "#" + hashStr).digest("hex");
    }

    return `${hashStr}#${expTime}#${userId}`;
}

export function validateQrHash(qrCode: string) {
    const parts = qrCode.split("#");
    const userId = parts[2];
    const expTime = parseInt(parts[1]);
    const generatedHash = generateQrHash(userId, expTime);

    if (generatedHash.split("#")[0] !== parts[0]) {
        throw new Error("Invalid QR code");
    }

    return { userId, expTime };
}