import * as CryptoJS from "crypto-js";
import { Config } from "../../config";

export async function decryptId(encryptedUserId: string) {
    const base64 = CryptoJS.enc.Hex.parse(encryptedUserId);
    const ciphertext = base64.toString(CryptoJS.enc.Base64);
    const userId = CryptoJS.AES.decrypt(
        ciphertext,
        Config.USERID_ENCRYPTION_KEY
    );
    return userId.toString(CryptoJS.enc.Utf8);
}
