import { Database } from "../../database";

export async function registrationExists(userId: string) {
    // Check if user already submitted registration before
    return Database.REGISTRATION.exists({
        userId: userId,
        hasSubmitted: true,
    });
}
