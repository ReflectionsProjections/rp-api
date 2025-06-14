import { Router } from "express";
import { Config } from "../../config";
import { StatusCodes } from "http-status-codes";
import jsonwebtoken from "jsonwebtoken";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { JwtPayloadType, Role } from "../auth/auth-models";
import { AuthLoginValidator, AuthRoleChangeRequest } from "./auth-schema";
import authSponsorRouter from "./sponsor/sponsor-router";
import { CorporateDeleteRequest, CorporateValidator } from "./corporate-schema";
import { OAuth2Client } from "google-auth-library";
import {
    getJwtPayloadFromDatabase,
    isPuzzleBang,
    updateDatabaseWithAuthPayload,
} from "./auth-utils";

const googleOAuthClient = new OAuth2Client({
    clientId: Config.CLIENT_ID,
    clientSecret: Config.CLIENT_SECRET,
});

const authRouter = Router();

authRouter.use("/sponsor", authSponsorRouter);

// Remove role from userId by email address (admin only endpoint)
authRouter.delete("/", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
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
});

// Add role to userId by email address (admin only endpoint)
authRouter.put("/", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
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
});

const getAuthPayloadFromCode = async (code: string, redirect_uri: string) => {
    try {
        const { tokens } = await googleOAuthClient.getToken({
            code,
            redirect_uri,
        });
        if (!tokens.id_token) {
            throw new Error("Invalid token");
        }
        const ticket = await googleOAuthClient.verifyIdToken({
            idToken: tokens.id_token,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            throw new Error("Invalid payload");
        }

        return payload;
    } catch (error) {
        console.error("AUTH ERROR:", error);
        return undefined;
    }
};

authRouter.post("/login/", async (req, res) => {
    // Convert id to token
    const { code, redirectUri } = AuthLoginValidator.parse(req.body);
    const authPayload = await getAuthPayloadFromCode(code, redirectUri);

    if (!authPayload) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .send({ error: "InvalidToken" });
    }

    const properScopes =
        "email" in authPayload && "sub" in authPayload && "name" in authPayload;
    if (!properScopes) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .send({ error: "InvalidScopes" });
    }

    // Update database by payload
    await updateDatabaseWithAuthPayload(authPayload);

    // Generate the JWT
    const jwtPayload = (
        await getJwtPayloadFromDatabase(`user${authPayload.sub}`)
    ).toObject() as JwtPayloadType;

    // Check if user has PuzzleBang role
    const isPB = isPuzzleBang(jwtPayload);

    const jwtToken = jsonwebtoken.sign(jwtPayload, Config.JWT_SIGNING_SECRET, {
        expiresIn: isPB
            ? Config.PB_JWT_EXPIRATION_TIME
            : Config.JWT_EXPIRATION_TIME,
    });

    return res.status(StatusCodes.OK).send({ token: jwtToken });
});

authRouter.get(
    "/corporate",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const allCorporate = await Database.CORPORATE.find();

        return res.status(StatusCodes.OK).json(allCorporate);
    }
);

authRouter.post(
    "/corporate",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const attendeeData = CorporateValidator.parse(req.body);
        const corporate = new Database.CORPORATE(attendeeData);
        await corporate.save();

        return res.status(StatusCodes.CREATED).json(corporate);
    }
);

authRouter.delete(
    "/corporate",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const attendeeData = CorporateDeleteRequest.parse(req.body);
        const email = attendeeData.email;
        await Database.CORPORATE.findOneAndDelete({ email: email });

        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

authRouter.get("/info", RoleChecker([]), async (req, res) => {
    const userId = res.locals.payload.userId;
    const user = await Database.ROLES.findOne({ userId }).select({
        displayName: true,
        roles: true,
        _id: false,
    });
    return res.status(StatusCodes.OK).json(user);
});

// Get a list of people by role (staff only endpoint)
authRouter.get("/:ROLE", RoleChecker([Role.Enum.STAFF]), async (req, res) => {
    // Validate the role using Zod schema
    const role = Role.parse(req.params.ROLE);

    const usersWithRole = await Database.ROLES.find({ roles: role });
    return res.status(StatusCodes.OK).json(usersWithRole);
});

export default authRouter;
