// Create a function to generate GoogleStrategy instances
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Config } from "../../config";
import { Database } from "../../database";
import { JwtPayloadType, Role } from "./auth-models";
import jsonwebtoken from "jsonwebtoken";

export const createOAuthClient = (clientId: string, clientSecret?: string) => {
    return new OAuth2Client({
        clientId,
        clientSecret,
    });
};

export async function updateDatabaseWithAuthPayload(payload: TokenPayload) {
    const userId = `user${payload.sub}`;
    const displayName = payload.name;
    const email = payload.email;

    // Check if user is admin -> if so, add ADMIN role to their list
    const isAdmin = email && Config.AUTH_ADMIN_WHITELIST.has(email);

    await Database.ROLES.findOneAndUpdate(
        { email: email },
        {
            userId,
            displayName,
            ...(isAdmin && { $addToSet: { roles: Role.Enum.ADMIN } }),
        },
        { upsert: true, new: true }
    );
}

export async function getJwtPayloadFromDatabase(userId: string) {
    const payload = await Database.ROLES.findOne({ userId: userId }).select([
        "userId",
        "displayName",
        "roles",
        "email",
    ]);

    if (!payload) {
        throw new Error("NoUserFound");
    }

    return payload;
}

export async function generateJWT(userId: string) {
    const jwtPayload = (
        await getJwtPayloadFromDatabase(userId)
    ).toObject() as JwtPayloadType;

    // Check if user has PuzzleBang role
    const isPB = isPuzzleBang(jwtPayload);

    return jsonwebtoken.sign(jwtPayload, Config.JWT_SIGNING_SECRET, {
        expiresIn: isPB
            ? Config.PB_JWT_EXPIRATION_TIME
            : Config.JWT_EXPIRATION_TIME,
    });
}

export function isUser(payload?: JwtPayloadType) {
    return payload?.roles.includes(Role.Enum.USER);
}

export function isStaff(payload?: JwtPayloadType) {
    return payload?.roles.includes(Role.Enum.STAFF);
}

export function isAdmin(payload?: JwtPayloadType) {
    return payload?.roles.includes(Role.Enum.ADMIN);
}

export function isPuzzleBang(payload?: JwtPayloadType) {
    return payload?.roles.includes(Role.Enum.PUZZLEBANG);
}
