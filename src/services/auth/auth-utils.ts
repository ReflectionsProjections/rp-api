// Create a function to generate GoogleStrategy instances
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Config } from "../../config";

export function createGoogleStrategy(device: string) {
    return new GoogleStrategy(
        {
            clientID: Config.CLIENT_ID,
            clientSecret: Config.CLIENT_SECRET,
            callbackURL: `${Config.AUTH_CALLBACK_URI_BASE}${device}`,
        },
        async function (_1, _2, profile, cb) {
            // Add profile to database here
            console.log(profile);
            cb(null, profile);
        }
    );
}
