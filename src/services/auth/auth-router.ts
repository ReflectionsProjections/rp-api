import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import Config from "../../config";
import RoleChecker from "../../middleware/role-checker";
import { Platform, Role } from "../auth/auth-models";
import {
    AuthInfo,
    AuthLoginValidator,
    AuthRoleChangeRequest,
} from "./auth-schema";
import authSponsorRouter from "./sponsor/sponsor-router";
import { CorporateDeleteRequest, CorporateValidator } from "./corporate-schema";
import {
    generateJWT,
    payloadHasProperScopes,
    updateDatabaseWithAuthPayload,
} from "./auth-utils";
import { OAuth2Client } from "google-auth-library";
import { SupabaseDB } from "../../database";

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

/**
 * @swagger
 * /auth/:
 *   delete:
 *     summary: Remove a role from a user
 *     description: |
 *       Removes a specific role from the specified user.
 *
 *       **Required roles: SUPER_ADMIN**
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRoleChangeRequest'
 *     responses:
 *       200:
 *         description: The deleted role record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRoleView'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
// Remove role from userId (super admin only endpoint)
authRouter.delete(
    "/",
    RoleChecker([Role.Enum.SUPER_ADMIN]),
    async (req, res) => {
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
    }
);

/**
 * @swagger
 * /auth/:
 *   put:
 *     summary: Add a role to a user
 *     description: |
 *       Adds (or upserts) a specific role for the specified user.
 *
 *       **Required roles: SUPER_ADMIN**
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRoleChangeRequest'
 *     responses:
 *       200:
 *         description: The upserted role record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRoleView'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "UserNotFound"
 *     security:
 *       - bearerAuth: []
 */
authRouter.put("/", RoleChecker([Role.Enum.SUPER_ADMIN]), async (req, res) => {
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
        console.error("AUTH ISSUE:", error);
        return undefined;
    }
};

/**
 * @swagger
 * /auth/login/{PLATFORM}:
 *   post:
 *     summary: Log in with Google OAuth
 *     description: |
 *       Exchanges a Google OAuth authorization code for a signed JWT.
 *       The request body shape varies by platform: web omits `codeVerifier`,
 *       iOS and Android require it.
 *
 *       **Required roles: none**
 *     tags: [Auth]
 *     parameters:
 *       - name: PLATFORM
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [WEB, IOS, ANDROID]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginValidator'
 *     responses:
 *       200:
 *         description: A signed JWT for the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthJwtResponse'
 *       400:
 *         description: Login failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "InvalidToken"
 *     security: []
 */
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

/**
 * @swagger
 * /auth/corporate:
 *   get:
 *     summary: Get all corporate sponsors
 *     description: |
 *       Returns all registered corporate sponsor records.
 *
 *       **Required roles: ADMIN**
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: List of corporate sponsor records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CorporateValidator'
 *     security:
 *       - bearerAuth: []
 */
authRouter.get(
    "/corporate",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { data } = await SupabaseDB.CORPORATE.select().throwOnError();

        return res.status(StatusCodes.OK).json(data);
    }
);

/**
 * @swagger
 * /auth/corporate:
 *   post:
 *     summary: Add a corporate sponsor
 *     description: |
 *       Creates a new corporate sponsor record.
 *
 *       **Required roles: ADMIN**
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorporateValidator'
 *     responses:
 *       201:
 *         description: The newly created corporate sponsor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CorporateValidator'
 *       400:
 *         description: Sponsor already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "AlreadyExists"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /auth/corporate:
 *   delete:
 *     summary: Remove a corporate sponsor
 *     description: |
 *       Deletes a corporate sponsor record by email.
 *
 *       **Required roles: ADMIN**
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorporateDeleteRequest'
 *     responses:
 *       204:
 *         description: Sponsor successfully deleted
 *       400:
 *         description: Sponsor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "NotFound"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /auth/info:
 *   get:
 *     summary: Get current user info
 *     description: |
 *       Returns the authenticated user's profile and assigned roles.
 *
 *       **Required roles: none**
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: The authenticated user's profile with roles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleValidator'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /auth/team:
 *   get:
 *     summary: Get all staff and admin team members
 *     description: |
 *       Returns all users who have been assigned the STAFF or ADMIN role,
 *       including their full profile and roles list.
 *
 *       **Required roles: ADMIN**
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: List of team members with roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoleValidator'
 *       500:
 *         description: Failed to fetch team members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "Failed to fetch team members"
 *     security:
 *       - bearerAuth: []
 */
// Get team members (users with STAFF or ADMIN roles)
authRouter.get("/team", RoleChecker([Role.Enum.ADMIN]), async (req, res) => {
    try {
        // Get all users first
        const { data: users } =
            await SupabaseDB.AUTH_INFO.select("*").throwOnError();

        // Get all roles
        const { data: roles } =
            await SupabaseDB.AUTH_ROLES.select("*").throwOnError();

        // Create a map of userId to roles
        const userRolesMap = new Map<string, Role[]>();
        roles?.forEach((roleRow: { userId: string; role: Role }) => {
            if (!userRolesMap.has(roleRow.userId)) {
                userRolesMap.set(roleRow.userId, []);
            }
            userRolesMap.get(roleRow.userId)!.push(roleRow.role);
        });

        // Filter to only users with STAFF or ADMIN roles
        const teamMembers =
            users
                ?.filter((user: AuthInfo) => {
                    const userRoles = userRolesMap.get(user.userId) || [];
                    return userRoles.some(
                        (role: Role) =>
                            role === Role.Enum.STAFF || role === Role.Enum.ADMIN
                    );
                })
                .map((user: AuthInfo) => ({
                    ...user,
                    roles: userRolesMap.get(user.userId) || [],
                })) || [];

        return res.status(StatusCodes.OK).json(teamMembers);
    } catch (error) {
        console.error("Error fetching team members:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "Failed to fetch team members",
        });
    }
});

/**
 * @swagger
 * /auth/staff:
 *   get:
 *     summary: Get all staff user IDs
 *     description: |
 *       Returns a list of user IDs for all users with the STAFF role.
 *       Intended for resume book access by corporate sponsors.
 *
 *       **Required roles: CORPORATE | STAFF**
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: List of staff user IDs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserIdsResponse'
 *     security:
 *       - bearerAuth: []
 */
// Get staff user ids for resume book
authRouter.get(
    "/staff",
    RoleChecker([Role.Enum.CORPORATE, Role.Enum.STAFF]),
    async (req, res) => {
        const { data } = await SupabaseDB.AUTH_ROLES.select("userId")
            .eq("role", Role.Enum.STAFF)
            .throwOnError();
        const userIds = data.map((row: { userId: string }) => row.userId);
        return res.status(StatusCodes.OK).json(userIds);
    }
);

/**
 * @swagger
 * /auth/{ROLE}:
 *   get:
 *     summary: Get user IDs by role
 *     description: |
 *       Returns a list of user IDs for all users assigned the specified role.
 *
 *       **Required roles: STAFF**
 *     tags: [Auth]
 *     parameters:
 *       - name: ROLE
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user IDs with the given role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserIdsResponse'
 *     security:
 *       - bearerAuth: []
 */
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
