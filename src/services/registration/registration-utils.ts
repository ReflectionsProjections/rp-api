import { SupabaseDB } from "../../supabase";
import * as CryptoJS from "crypto-js";
import { Config } from "../../config";

export async function registrationExists(userId: string) {
    const { data } = await SupabaseDB.REGISTRATIONS.select("user_id")
        .eq("user_id", userId)
        .eq("has_submitted", true)
        .limit(1)
        .throwOnError();

    return data && data.length > 0;
}

export async function generateEncryptedId(userId: string) {
    const b64 = CryptoJS.AES.encrypt(
        userId,
        Config.USERID_ENCRYPTION_KEY
    ).toString();

    const base64 = CryptoJS.enc.Base64.parse(b64);
    return base64.toString(CryptoJS.enc.Hex);
}
