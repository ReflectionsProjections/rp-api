// Create a function to generate GoogleStrategy instances
import { TokenPayload } from "google-auth-library";
import { Config } from "../../config";
import { SupabaseDB } from "../../supabase";
import { JwtPayloadType, Role } from "./auth-models";
import jsonwebtoken from "jsonwebtoken";
import { randomUUID } from "crypto";

export type TokenPayloadWithProperScopes = TokenPayload & {
    sub: string;
    name: string;
    email: string;
};
export function payloadHasProperScopes(
    payload: TokenPayload
): payload is TokenPayloadWithProperScopes {
    return "email" in payload && "sub" in payload && "name" in payload;
}

export async function createUserByEmail(email: string) {
    const { data } = await SupabaseDB.AUTH_INFO.insert({
        userId: randomUUID(),
        email,
        displayName: "",
    })
        .select()
        .single()
        .throwOnError();
    return data;
}

export async function updateDatabaseWithAuthPayload(
    payload: TokenPayloadWithProperScopes
): Promise<string> {
    const authId = payload.sub; // If we ever support multiple platforms, will need to change this, but fine for now
    const displayName = payload.name;
    const email = payload.email;

    // Check for an existing user with matching email
    const { data } = await SupabaseDB.AUTH_INFO.select("userId")
        .eq("email", email)
        .maybeSingle()
        .throwOnError();

    // If they exist, use that userId - otherwise generate a new one
    const userId = data ? data.userId : randomUUID();

    // Create or update that user
    await SupabaseDB.AUTH_INFO.upsert({
        authId,
        email,
        displayName,
        userId,
    })
        .eq("userId", userId)
        .throwOnError();

    // If the user is ADMIN, add the admin role to them
    if (Config.AUTH_ADMIN_WHITELIST.has(email)) {
        await SupabaseDB.AUTH_ROLES.upsert({
            userId,
            role: Role.Enum.ADMIN,
        }).eq("email", email);
    }

    // Return the userId updated
    return userId;
}

export async function getJwtPayloadFromDatabase(
    userId: string
): Promise<JwtPayloadType> {
    const { data } = await SupabaseDB.AUTH_INFO.select("email, displayName")
        .eq("userId", userId)
        .maybeSingle()
        .throwOnError();

    if (!data) {
        throw new Error("NoUserFound");
    }
    const { email, displayName } = data;

    const { data: rolesRows } = await SupabaseDB.AUTH_ROLES.select()
        .eq("userId", userId)
        .throwOnError();
    const roles = rolesRows.map((row) => row.role);

    return {
        userId,
        email,
        displayName,
        roles,
    };
}

export async function generateJWT(userId: string) {
    const jwtPayload = await getJwtPayloadFromDatabase(userId);

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
