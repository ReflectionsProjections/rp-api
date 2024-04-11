// Create a function to generate GoogleStrategy instances
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Config } from "../../config";
import { Role } from "./auth-schema";
import { Database } from "../../database";

export function createGoogleStrategy(device: string) {
    return new GoogleStrategy(
        {
            clientID: Config.CLIENT_ID,
            clientSecret: Config.CLIENT_SECRET,
            callbackURL: `${Config.AUTH_CALLBACK_URI_BASE}${device}`,
        },

        // Strategy -> insert user into database if they don't exist
        async function (_1, _2, profile, cb) {
            const userId = `user${profile.id}`;
            const name = profile.displayName;
            const email = profile._json.email;
            const roles = [Role.Enum.USER];

            Database.ROLES.findOneAndUpdate(
                { userId: userId },
                { userId, name, email, roles },
                { upsert: true }
            )
                .then(() => cb(null, profile))
                .catch((err) => cb(err, profile));
        }
    );
}
