import { Router } from "express";
import passport from "passport";
import { Config, DeviceRedirects } from "../../config";
import { StatusCodes } from "http-status-codes";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { createGoogleStrategy, getJwtPayloadFromDatabase } from "./auth-utils";
import jsonwebtoken from "jsonwebtoken";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role, JwtPayloadType } from "../auth/auth-models";
import { AuthRoleChangeRequest } from "./auth-schema";
import { z } from "zod";
import authSponsorRouter from "./sponsor/sponsor-router";
import { isPuzzleBang } from "../auth/auth-utils";

const authStrategies: Record<string, GoogleStrategy> = {};

for (const key in DeviceRedirects) {
    authStrategies[key] = createGoogleStrategy(key);
}

const authRouter = Router();

authRouter.use("/sponsor", authSponsorRouter);

// Remove role from userId by email address (admin only endpoint)
authRouter.delete(
    "/",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            // Validate request body using Zod schema
            const { email, role } = AuthRoleChangeRequest.parse(req.body);

            // Use findOneAndUpdate to remove the role
            const user = await Database.ROLES.findOneAndUpdate(
                { email: email },
                { $pull: { roles: role } },
                { new: true }
            );

            if (!user) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    error: "UserNotFound",
                });
            }

            return res.status(StatusCodes.OK).json(user);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: "BadRole",
                    details: error.errors,
                });
            }

            next(error);
        }
    }
);

// Add role to userId by email address (admin only endpoint)
authRouter.put("/", RoleChecker([Role.Enum.ADMIN]), async (req, res, next) => {
    try {
        const { email, role } = AuthRoleChangeRequest.parse(req.body);

        const user = await Database.ROLES.findOneAndUpdate(
            { email: email },
            { $addToSet: { roles: role } },
            { new: true, upsert: true }
        );

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: "UserNotFound",
            });
        }

        return res.status(StatusCodes.OK).json(user);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: "BadRole",
            });
        }

        next(error);
    }
});

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
            ).toObject() as JwtPayloadType;

            // Check if user has PuzzleBang role
            const isPB = isPuzzleBang(jwtPayload);

            const token = jsonwebtoken.sign(
                jwtPayload,
                Config.JWT_SIGNING_SECRET,
                {
                    expiresIn: isPB
                        ? Config.PB_JWT_EXPIRATION_TIME
                        : Config.JWT_EXPIRATION_TIME,
                }
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
    "/:ROLE",
    RoleChecker([Role.Enum.STAFF]),
    async (req, res, next) => {
        try {
            // Validate the role using Zod schema
            const role = Role.parse(req.params.ROLE);

            const usersWithRole = await Database.ROLES.find({ roles: role });
            return res.status(StatusCodes.OK).json(usersWithRole);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    error: "BadRole",
                });
            }

            next(error);
        }
    }
);

authRouter.post(
    "/corporate/:email",
    RoleChecker([Role.Enum.ADMIN], true),
    async (req, res, next) => {
        try {
            const email = req.params.email;
            const corporate = new Database.CORPORATE({ email: email });
            await corporate.save();
            return res.status(StatusCodes.CREATED).json(email);
        } catch (error) {
            next(error);
        }
    }
);

authRouter.delete(
    "/corporate/:email",
    RoleChecker([Role.Enum.ADMIN], true),
    async (req, res, next) => {
        try {
            const email = req.params.email;
            await Database.CORPORATE.findOneAndDelete({ email: email });

            return res.sendStatus(StatusCodes.NO_CONTENT);
        } catch (error) {
            next(error);
        }
    }
);

export default authRouter;
