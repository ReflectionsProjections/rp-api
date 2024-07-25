import * as bcrypt from "bcrypt";


export function createSixDigitCode() {
    let result = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function encryptSixDigitCode(sixDigitCode: string): string {
    const saltRounds = 10;

    try {
        const hash = bcrypt.hashSync(sixDigitCode, saltRounds);
        return hash;
    } catch (err) {
        console.error("Error encrypting the code:", err);
        throw err;
    }
}
