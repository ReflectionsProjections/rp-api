import * as bcrypt from "bcrypt";
import { Database } from "../../../database";
import { Config } from "../../../config";

export function createSixDigitCode() {
    let result = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function encryptSixDigitCode(sixDigitCode: string): string {
    try {
        const hash = bcrypt.hashSync(sixDigitCode, Config.HASH_SALT_ROUNDS);
        return hash;
    } catch (err) {
        console.error("Error encrypting the code:", err);
        throw err;
    }
}

export async function sponsorExists(email: string) {
    const response = await Database.CORPORATE.findOne({ email: email });
    if (!response) return false;
    return true;
}
