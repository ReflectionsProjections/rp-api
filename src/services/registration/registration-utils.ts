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
    var b64 = CryptoJS.AES.encrypt(
        userId,
        Config.USERID_ENCRYPTION_KEY
    ).toString();
    var e64 = CryptoJS.enc.Base64.parse(b64);
    var eHex = e64.toString(CryptoJS.enc.Hex);
    return eHex;
}
