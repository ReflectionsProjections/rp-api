import { Router } from "express";
import passport from "passport";
import { Config, DeviceRedirects } from "../../config";
import { StatusCodes } from "http-status-codes";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { createGoogleStrategy, getJwtPayloadFromDatabase } from "./auth-utils";
import jsonwebtoken from "jsonwebtoken";

const authStrategies: Record<string, GoogleStrategy> = {};

for (const key in DeviceRedirects) {
    authStrategies[key] = createGoogleStrategy(key);
}

const authRouter = Router();

authRouter.get("/login/:DEVICE/", (req, res) => {
    const device = req.params.DEVICE;

    // Check if this is a valid device (i.e. does a redirectURI exist for it)
    if (!(device in DeviceRedirects)) {
        return res.status(StatusCodes.BAD_REQUEST).send({ error: "BadDevice" });
    }

    // Use the pre-created strategy
    // passport.use(authStrategies[device]);

    return passport.authenticate(authStrategies[device], {
        scope: ["profile", "email"],
    })(req, res);
});

authRouter.get(
    "/callback/:DEVICE",
    (req, res, next) =>
        // Check based on the pre-existing strategy name
        passport.authenticate(authStrategies[req.params.DEVICE], {
            session: false,
        })(req, res, next),
    async function (req, res, next) {
        // Authentication failed - redirect to login
        if (req.user == undefined) {
            return res.redirect(`/auth/login/${req.params.DEVICE}`);
        }
        const userData = req.user as Profile;
        const userId = `user${userData.id}`;

        // Generate the JWT, and redirect to JWT initialization
        try {
            const jwtPayload = (
                await getJwtPayloadFromDatabase(userId)
            ).toObject();
            const token = jsonwebtoken.sign(
                jwtPayload,
                Config.JWT_SIGNING_SECRET,
                { expiresIn: Config.JWT_EXPIRATION_TIME }
            );
            const redirectUri =
                DeviceRedirects[req.params.DEVICE] + `?token=${token}`;
            console.log(redirectUri);
            return res.redirect(redirectUri);
        } catch (error) {
            next(error);
        }
    }
);

authRouter.get("/dev/", (req, res) => {
    return res.status(StatusCodes.OK).json(req.query);
});

export default authRouter;
