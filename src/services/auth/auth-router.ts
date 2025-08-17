import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import Config from "../../config";
import RoleChecker from "../../middleware/role-checker";
import { Platform, Role } from "../auth/auth-models";
import { AuthLoginValidator, AuthRoleChangeRequest } from "./auth-schema";
import authSponsorRouter from "./sponsor/sponsor-router";
import { CorporateDeleteRequest, CorporateValidator } from "./corporate-schema";
import {
    generateJWT,
    payloadHasProperScopes,
    updateDatabaseWithAuthPayload,
} from "./auth-utils";
import { OAuth2Client } from "google-auth-library";
import { SupabaseDB } from "../../supabase";

const authRouter = Router();

const oauthClients = {
    [Platform.WEB]: new OAuth2Client({
        clientId: Config.CLIENT_ID,
        clientSecret: Config.CLIENT_SECRET,
    }),
    [Platform.IOS]: new OAuth2Client({
        clientId: Config.IOS_CLIENT_ID,
    }),
    [Platform.ANDROID]: new OAuth2Client({
        clientId: Config.ANDROID_CLIENT_ID,
    }),
};

authRouter.use("/sponsor", authSponsorRouter);

// Remove role from userId (admin only endpoint)
authRouter.delete("/", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
    // Validate request body using Zod schema
    const { userId, role } = AuthRoleChangeRequest.parse(req.body);

    const { data } = await SupabaseDB.AUTH_INFO.select("userId")
        .eq("userId", userId)
        .maybeSingle()
        .throwOnError();

    if (!data) {
        return res.status(StatusCodes.NOT_FOUND).json({
            error: "UserNotFound",
        });
    }

    const { data: deleted } = await SupabaseDB.AUTH_ROLES.delete()
        .eq("userId", userId)
        .eq("role", role)
        .select()
        .single()
        .throwOnError();

    return res.status(StatusCodes.OK).json(deleted);
});

// Add role to userId (admin only endpoint)
authRouter.put("/", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
    const { userId, role } = AuthRoleChangeRequest.parse(req.body);

    const { data } = await SupabaseDB.AUTH_INFO.select("userId")
        .eq("userId", userId)
        .maybeSingle()
        .throwOnError();

    if (!data) {
        return res.status(StatusCodes.NOT_FOUND).json({
            error: "UserNotFound",
        });
    }

    const { data: updated } = await SupabaseDB.AUTH_ROLES.upsert({
        userId,
        role,
    })
        .select()
        .single()
        .throwOnError();

    return res.status(StatusCodes.OK).json(updated);
});

const getAuthPayloadFromCode = async (
    code: string,
    redirect_uri: string,
    platform: Platform,
    codeVerifier?: string
) => {
    try {
        const googleOAuthClient = oauthClients[platform];
        const { tokens } = await googleOAuthClient.getToken({
            code,
            redirect_uri,
            codeVerifier, // only for mobile apps
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
        const validatedData = AuthLoginValidator.parse({
            ...req.body,
            platform: req.params.PLATFORM,
        });

        const { code, redirectUri, platform } = validatedData;
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

        if (!payloadHasProperScopes(authPayload)) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send({ error: "InvalidScopes" });
        }

        // Update database by payload
        const userId = await updateDatabaseWithAuthPayload(authPayload);

        // Generate the JWT
        const jwtToken = await generateJWT(userId);

        return res.status(StatusCodes.OK).send({ token: jwtToken });
    } catch (error) {
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
        const { data } = await SupabaseDB.CORPORATE.select().throwOnError();

        return res.status(StatusCodes.OK).json(data);
    }
);

authRouter.post(
    "/corporate",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const data = CorporateValidator.parse(req.body);
        const { data: existing } = await SupabaseDB.CORPORATE.select()
            .eq("email", data.email)
            .throwOnError();
        if (existing.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).send({
                error: "AlreadyExists",
            });
        }
        const { data: corporate } = await SupabaseDB.CORPORATE.insert(data)
            .select()
            .single()
            .throwOnError();

        return res.status(StatusCodes.CREATED).json(corporate);
    }
);

authRouter.delete(
    "/corporate",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { email } = CorporateDeleteRequest.parse(req.body);
        const { data } = await SupabaseDB.CORPORATE.delete()
            .eq("email", email)
            .select()
            .throwOnError();

        if (data.length == 0) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .send({ error: "NotFound" });
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

authRouter.get("/info", RoleChecker([]), async (req, res) => {
    const userId = res.locals.payload.userId;
    const { data: info } = await SupabaseDB.AUTH_INFO.select()
        .eq("userId", userId)
        .single()
        .throwOnError();
    const { data: roleRows } = await SupabaseDB.AUTH_ROLES.select()
        .eq("userId", userId)
        .throwOnError();
    const user = {
        ...info,
        roles: roleRows.map((row: { role: Role }) => row.role),
    };
    return res.status(StatusCodes.OK).json(user);
});

// Get a list of user ids by role (staff only endpoint)
authRouter.get("/:ROLE", RoleChecker([Role.Enum.STAFF]), async (req, res) => {
    // Validate the role using Zod schema
    const role = Role.parse(req.params.ROLE);

    const { data } = await SupabaseDB.AUTH_ROLES.select("userId")
        .eq("role", role)
        .throwOnError();
    const userIds = data.map((row: { userId: string }) => row.userId);
    return res.status(StatusCodes.OK).json(userIds);
});

export default authRouter;
