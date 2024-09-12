// Create a function to generate GoogleStrategy instances
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Config } from "../../config";
import { Database } from "../../database";
import { JwtPayloadType, Role } from "./auth-models";
import jsonwebtoken from "jsonwebtoken";

export function createGoogleStrategy(device: string) {
    return new GoogleStrategy(
        {
            clientID: Config.CLIENT_ID,
            clientSecret: Config.CLIENT_SECRET,
            callbackURL: Config.AUTH_CALLBACK_URI_BASE + device,
        },

        // Strategy -> insert user into database if they don't exist
        async function (_1, _2, profile, cb) {
            const userId = `user${profile.id}`;
            const displayName = profile.displayName;
            const email = profile._json.email;

            // Check if user is admin -> if so, add ADMIN role to their list
            const isAdmin = email && Config.AUTH_ADMIN_WHITELIST.has(email);

            Database.ROLES.findOneAndUpdate(
                { email: email },
                {
                    userId,
                    displayName,
                    ...(isAdmin && { $addToSet: { roles: Role.Enum.ADMIN } }),
                },
                { upsert: true }
            )
                .then(() => cb(null, profile))
                .catch((err) => cb(err, profile));
        }
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
    try {
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
    } catch (error) {
        next(error);
    }
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
function next(error: unknown) {
    console.error(error);
    throw new Error("Function not implemented.");
}
