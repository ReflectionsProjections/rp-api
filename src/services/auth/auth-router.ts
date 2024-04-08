import { Router } from "express";
import passport, { AuthenticateOptions } from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Config } from "../../config";
import { StatusCodes } from "http-status-codes";
import { Devices } from "./auth-schema";

passport.use(
    new GoogleStrategy(
        {
            clientID: Config.CLIENT_ID,
            clientSecret: Config.CLIENT_SECRET,
            callbackURL: Config.REDIRECT_URI,
        },
        function (_1, _2, profile, cb) {
            cb(null, profile);
        }
    )
);

const authRouter = Router();

authRouter.get("/login/:DEVICE/", (req, res) => {
    const device = req.params["DEVICE"];

    console.log(device, Devices.Values);

    if (!Devices.safeParse(device).success) {
        return res.status(StatusCodes.BAD_REQUEST).send({ error: "BadDevice" });
    }

    const callbackURL = `${Config.REDIRECT_URI}/${device}`;

    console.log(`|${callbackURL}|`);
    return passport.authenticate("google", {
        callbackURL: callbackURL,
        scope: ["profile", "email"],
    } as AuthenticateOptions)(req, res);
});

authRouter.get(
    "/callback/",
    (req, _, next) => {
        console.log("HI!!! params be", req.params, req.query);
        return next();
    },
    passport.authenticate("google", {
        session: false,
    }),
    function (req, res) {
        console.log("IN HERE");
        console.log(req.params);
        console.log(req.query);
        console.log("redirecting!");
        return res.redirect("/");
    }
);

export default authRouter;
