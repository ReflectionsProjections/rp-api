import * as CryptoJS from "crypto-js";
import { Config } from "../../config";

export async function decryptId(encryptedUserId: string) {
    var reb64 = CryptoJS.enc.Hex.parse(encryptedUserId);
    var bytes = reb64.toString(CryptoJS.enc.Base64);
    var decrypt = CryptoJS.AES.decrypt(bytes, Config.USERID_ENCRYPTION_KEY);
    var plain = decrypt.toString(CryptoJS.enc.Utf8);
    return plain;
}
