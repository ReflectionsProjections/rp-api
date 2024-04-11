import { Router } from "express";
import passport from "passport";
import { DeviceRedirects } from "../../config";
import { StatusCodes } from "http-status-codes";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { createGoogleStrategy } from "./auth-utils";

const authStrategies: Record<string, GoogleStrategy> = {};

const authRouter = Router();

authRouter.get("/login/:DEVICE/", (req, res) => {
    const device = req.params.DEVICE;

    // Check if this is a valid device (i.e. does a redirectURI exist for it)
    if (!(device in DeviceRedirects)) {
        return res.status(StatusCodes.BAD_REQUEST).send({ error: "BadDevice" });
    }

    // Check if we've already created an auth strategy for the device
    // If not, create a new one
    if (!(device in authStrategies)) {
        authStrategies[device] = createGoogleStrategy(device);
    }

    // Use the pre-created strategy
    passport.use(device, authStrategies[device]);

    return passport.authenticate(device, {
        scope: ["profile", "email"],
    })(req, res);
});

authRouter.get(
    "/callback/:DEVICE",
    (req, res, next) =>
        // Check based on the pre-existing strategy name
        passport.authenticate(req.params.DEVICE, {
            session: false,
        })(req, res, next),
    function (req, res) {
        const redirectUri = `${DeviceRedirects[req.params.DEVICE]}`
        return res.redirect(redirectUri);
    }
);

export default authRouter;
