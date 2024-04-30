import crypto from "crypto";
import { Config } from "../../config";

export const generateQrHash = (userId: string, expTime: number) => {
    let hashStr = userId + "#" + expTime;
    const hashIterations = Number(Config.QR_HASH_ITERATIONS);
    const hashSecret = Config.QR_HASH_SECRET;

    const hmac = crypto.createHmac("sha256", hashSecret);
    hashStr = hmac.update(hashStr).digest("hex");

    for (let i = 0; i < hashIterations; i++) {
        const hash = crypto.createHash("sha256");
        hashStr = hash.update(hashSecret + "#" + hashStr).digest("hex");
    }

    return `${hashStr}#${expTime}#${userId}`;
};
