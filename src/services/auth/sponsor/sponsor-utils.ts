import * as bcrypt from "bcrypt";
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
    const hash = bcrypt.hashSync(sixDigitCode, Config.HASH_SALT_ROUNDS);
    return hash;
}
