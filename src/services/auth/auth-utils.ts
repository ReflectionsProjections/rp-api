// Create a function to generate GoogleStrategy instances
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Config } from "../../config";
import { Database } from "../../database";
import { Role } from "./auth-models";

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
            const roles = [];

            // Check if user is admin -> if so, add ADMIN role to their list
            if (Config.AUTH_ADMIN_WHITELIST.has(email ?? "")) {
                roles.push(Role.Enum.ADMIN);
            }

            Database.ROLES.findOneAndUpdate(
                { userId: userId },
                { userId, displayName, email, roles },
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
    ]);
    if (!payload) {
        throw new Error("NoUserFound");
    }

    return payload;
}
