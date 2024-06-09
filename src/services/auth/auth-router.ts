import { Router } from "express";
import passport from "passport";
import { Config, DeviceRedirects } from "../../config";
import { StatusCodes } from "http-status-codes";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { createGoogleStrategy, getJwtPayloadFromDatabase } from "./auth-utils";
import jsonwebtoken from "jsonwebtoken";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const authStrategies: Record<string, GoogleStrategy> = {};

for (const key in DeviceRedirects) {
    authStrategies[key] = createGoogleStrategy(key);
}

const authRouter = Router();

// Add role to userId by email address (admin only endpoint)
authRouter.put(
    "/addRoleByEmail/",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            const email: string = req.body.email as string;
            const role: string = req.body.role as string;
            const user = await Database.ROLES.findOne({ email: email });

            if (!user) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    error: "UserNotFound",
                });
            }

            const userRoles: string[] = user.roles as string[];

            // Add role if it does not exist
            if (!userRoles.includes(role)) {
                userRoles.push(role);
                await user.save();
            }

            return res.status(StatusCodes.OK).json(user);
        } catch (error) {
            next(error);
        }
    }
);

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

// Get a list of people by role (staff only endpoint)
authRouter.get(
    "/getPeopleByRole/:ROLE",
    RoleChecker([Role.Enum.STAFF]),
    async (req, res, next) => {
        try {
            const role = req.params.ROLE;
            const usersWithRole = await Database.ROLES.find({ roles: role });
            return res.status(StatusCodes.OK).json(usersWithRole);
        } catch (error) {
            next(error);
        }
    }
);

export default authRouter;
