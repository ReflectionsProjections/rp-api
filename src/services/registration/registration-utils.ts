import { Database } from "../../database";
import * as CryptoJS from "crypto-js";
import { Config } from "../../config";

export async function registrationExists(userId: string) {
    // Check if user already submitted registration before
    return Database.REGISTRATION.exists({
        userId: userId,
        hasSubmitted: true,
    });
}

export async function generateEncryptedId(userId: string) {
    const b64 = CryptoJS.AES.encrypt(
        userId,
        Config.USERID_ENCRYPTION_KEY
    ).toString();

    const base64 = CryptoJS.enc.Base64.parse(b64);
    return base64.toString(CryptoJS.enc.Hex);
}
