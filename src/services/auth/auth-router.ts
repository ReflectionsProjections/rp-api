import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import Config from "../../config";
import RoleChecker from "../../middleware/role-checker";
import { Platform, Role } from "../auth/auth-models";
import { ZodError } from "zod";
import { AuthLoginValidator, AuthRoleChangeRequest } from "./auth-schema";
import authSponsorRouter from "./sponsor/sponsor-router";
import { CorporateDeleteRequest, CorporateValidator } from "./corporate-schema";
import {
    generateJWT,
    updateDatabaseWithAuthPayload,
    createOAuthClient,
} from "./auth-utils";

const authRouter = Router();

const oauthClients = {
    [Platform.Enum.WEB]: createOAuthClient(
        Config.CLIENT_ID,
        Config.CLIENT_SECRET
    ),
    [Platform.Enum.IOS]: createOAuthClient(Config.IOS_CLIENT_ID),
    // TODO: add android client
};

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

    return res.status(StatusCodes.OK).json(user);
});

const getAuthPayloadFromCode = async (
    code: string,
    redirect_uri: string,
    platform: Platform,
    code_verifier?: string
) => {
    try {
        const googleOAuthClient = oauthClients[platform];
        const { tokens } = await googleOAuthClient.getToken({
            code,
            redirect_uri,
            codeVerifier: code_verifier, // only for mobile apps
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

authRouter.post("/login/:PLATFORM", async (req, res) => {
    try {
        const platform = Platform.parse(req.params.PLATFORM);
        const requestBody = { ...req.body, platform };
        const validatedData = AuthLoginValidator.parse(requestBody);

        const { code, redirectUri } = validatedData;
        const codeVerifier =
            "codeVerifier" in validatedData
                ? validatedData.codeVerifier
                : undefined;

        const authPayload = await getAuthPayloadFromCode(
            code,
            redirectUri,
            platform,
            codeVerifier
        );

        if (!authPayload) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send({ error: "InvalidToken" });
        }

        const properScopes =
            "email" in authPayload &&
            "sub" in authPayload &&
            "name" in authPayload;
        if (!properScopes) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send({ error: "InvalidScopes" });
        }

        // Update database by payload
        await updateDatabaseWithAuthPayload(authPayload);

        // Generate the JWT
        const jwtToken = await generateJWT(`user${authPayload.sub}`);

        return res.status(StatusCodes.OK).send({ token: jwtToken });
    } catch (error) {
        console.error("Error in platform login:", error);
        return res.status(StatusCodes.BAD_REQUEST).send({
            error: "InvalidRequest",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

authRouter.post("/login/:PLATFORM", async (req, res) => {
    try {
        const platform = Platform.parse(req.params.PLATFORM);

        const requestBody = { ...req.body, platform };
        const validatedData = AuthLoginValidator.parse(requestBody);

        const { code, redirectUri } = validatedData;
        const codeVerifier =
            "codeVerifier" in validatedData
                ? validatedData.codeVerifier
                : undefined;

        const authPayload = await getAuthPayloadFromCode(
            code,
            redirectUri,
            platform,
            codeVerifier
        );

        if (!authPayload) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send({ error: "InvalidToken" });
        }

        const properScopes =
            "email" in authPayload &&
            "sub" in authPayload &&
            "name" in authPayload;
        if (!properScopes) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send({ error: "InvalidScopes" });
        }

        // Update database by payload
        await updateDatabaseWithAuthPayload(authPayload);

        // Generate the JWT
        const jwtToken = await generateJWT(`user${authPayload.sub}`);

        return res.status(StatusCodes.OK).send({ token: jwtToken });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "InvalidRequest",
                details: "Validation failed",
            });
        }

        // Handle other errors
        console.error("Error in platform login:", error);
        return res.status(StatusCodes.BAD_REQUEST).send({
            error: "InvalidRequest",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
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
        const existing = await Database.CORPORATE.findOne({
            email: attendeeData.email,
        });
        if (existing) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "AlreadyExists",
            });
        }
        const corporate = await Database.CORPORATE.create(attendeeData);

        return res.status(StatusCodes.CREATED).json(corporate);
    }
);

authRouter.delete(
    "/corporate",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { email } = CorporateDeleteRequest.parse(req.body);
        const result = await Database.CORPORATE.findOneAndDelete({
            email: email,
        });

        if (!result) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send({ error: "NotFound" });
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

authRouter.get("/info", RoleChecker([]), async (req, res) => {
    const userId = res.locals.payload.userId;
    const user = await Database.ROLES.findOne({ userId }).select({
        displayName: true,
        roles: true,
        userId: true,
        email: true,
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
