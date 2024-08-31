import * as CryptoJS from "crypto-js";
import { Config } from "../../config";

export async function decryptId(encryptedUserId: string) {
    // return CryptoJS.AES.decrypt(userId, Config.USERID_ENCRYPTION_KEY).toString();
    const decryptedBytes = CryptoJS.AES.decrypt(
        encryptedUserId,
        Config.USERID_ENCRYPTION_KEY
    );
    return decryptedBytes.toString(CryptoJS.enc.Utf8);
}
