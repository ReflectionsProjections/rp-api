import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SubscriptionValidator } from "./subscription-schema";
import { SupabaseDB } from "../../database";
import cors from "cors";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import Config from "../../config";

const subscriptionRouter = Router();

const sesClient = new SESv2Client({
    region: Config.S3_REGION!,
    credentials: {
        accessKeyId: Config.S3_ACCESS_KEY!,
        secretAccessKey: Config.S3_SECRET_KEY!,
    },
});

/**
 * @swagger
 * /subscription/:
 *   post:
 *     summary: Subscribe to a mailing list
 *     description: |
 *       Creates a subscription for the given user and mailing list.
 *       Idempotent — if the subscription already exists it is not duplicated.
 *
 *       **Required roles: none**
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionValidator'
 *     responses:
 *       201:
 *         description: Subscription created (or already existed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionValidator'
 *       400:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "User not found."
 *     security: []
 */
// Create a new subscription
subscriptionRouter.post("/", cors(), async (req, res) => {
    // Validate the incoming user subscription
    const subscriptionData = SubscriptionValidator.parse(req.body);

    const { userId, mailingList } = subscriptionData;

    // Check if the user exists
    const { data: user } = await SupabaseDB.AUTH_INFO.select("userId")
        .eq("userId", userId)
        .maybeSingle()
        .throwOnError();

    if (!user) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: "User not found." });
    }

    // Check if this specific subscription already exists
    const { data: existingSubscription } =
        await SupabaseDB.SUBSCRIPTIONS.select("userId, mailingList")
            .eq("userId", userId)
            .eq("mailingList", mailingList)
            .maybeSingle()
            .throwOnError();

    if (!existingSubscription) {
        // Create the subscription if it doesn't exist
        await SupabaseDB.SUBSCRIPTIONS.insert({
            userId: userId,
            mailingList: mailingList,
        }).throwOnError();
    }

    return res.status(StatusCodes.CREATED).json(subscriptionData);
});

/**
 * @swagger
 * /subscription/:
 *   get:
 *     summary: Get all subscriptions
 *     description: |
 *       Returns every subscription record in the database.
 *
 *       **Required roles: ADMIN**
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of all subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubscriptionValidator'
 *     security:
 *       - bearerAuth: []
 */
// Get a list of all subscriptions - envisioning that admins can use this as dropdown to choose who to send emails to
subscriptionRouter.get(
    "/",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { data: subscriptions } =
            await SupabaseDB.SUBSCRIPTIONS.select("*").throwOnError();

        return res.status(StatusCodes.OK).json(subscriptions);
    }
);

/**
 * @swagger
 * /subscription/lists:
 *   get:
 *     summary: Get all unique mailing list names
 *     description: |
 *       Returns a deduplicated list of every mailing list that has at least
 *       one subscriber.
 *
 *       **Required roles: ADMIN**
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of unique mailing list names
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["rp_interest", "attendees"]
 *     security:
 *       - bearerAuth: []
 */
subscriptionRouter.get(
    "/lists",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { data: subscriptions } =
            await SupabaseDB.SUBSCRIPTIONS.select("mailingList").throwOnError();

        const uniqueMailingLists = [
            ...new Set(subscriptions?.map((sub) => sub.mailingList) || []),
        ];

        return res.status(StatusCodes.OK).json(uniqueMailingLists);
    }
);

/**
 * @swagger
 * /subscription/send-email:
 *   post:
 *     summary: Send an email to a mailing list
 *     description: |
 *       Sends an HTML email to all subscribers of the given mailing list via
 *       AWS SES. BCC is used so recipients cannot see each other's addresses.
 *
 *       **Required roles: SUPER_ADMIN**
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendEmailValidator'
 *     responses:
 *       200:
 *         description: Email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionSuccessResponse'
 *       404:
 *         description: No subscribers found for this mailing list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "No subscribers found for this mailing list."
 *     security:
 *       - bearerAuth: []
 */
// Send an email to a mailing list
// API body: {String} mailingList The list to send the email to, {String} subject The subject line of the email, {String} htmlBody The HTML content of the email.
subscriptionRouter.post(
    "/send-email",
    RoleChecker([Role.Enum.SUPER_ADMIN]),
    async (req, res) => {
        const { mailingList, subject, htmlBody } = req.body;

        // Get all users subscribed to this mailing list
        const { data: subscriptions } = await SupabaseDB.SUBSCRIPTIONS.select(
            "userId"
        )
            .eq("mailingList", mailingList)
            .throwOnError();

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                error: "No subscribers found for this mailing list.",
            });
        }

        // need to batch to avoid URL length limits
        const userIds = subscriptions.map((sub) => sub.userId);
        const BATCH_SIZE = 100;
        const emailAddresses: string[] = [];

        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            const batch = userIds.slice(i, i + BATCH_SIZE);
            const { data: users } = await SupabaseDB.AUTH_INFO.select("email")
                .in("userId", batch)
                .throwOnError();

            const batchEmails = users?.map((user) => user.email) || [];
            emailAddresses.push(...batchEmails);
        }

        const sendEmailCommand = new SendEmailCommand({
            FromEmailAddress: Config.FROM_EMAIL_ADDRESS ?? "",
            Destination: {
                // SES can send to multiple addresses at once
                // ToAddresses: emailAddresses,
                // Let's send to ourselves for now, and bcc everyone else, probably the most pro way to go about it.
                ToAddresses: [Config.FROM_EMAIL_ADDRESS ?? ""],
                BccAddresses: emailAddresses,
            },
            Content: {
                Simple: {
                    Subject: { Data: subject },
                    Body: { Html: { Data: htmlBody } },
                },
            },
        });

        await sesClient.send(sendEmailCommand);

        return res.status(StatusCodes.OK).send({ status: "success" });
    }
);

/**
 * @swagger
 * /subscription/send-email/single:
 *   post:
 *     summary: Send an email to a single address
 *     description: |
 *       Sends an HTML email to one specific email address via AWS SES.
 *
 *       **Required roles: SUPER_ADMIN**
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendEmailSingleValidator'
 *     responses:
 *       200:
 *         description: Email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionSuccessResponse'
 *     security:
 *       - bearerAuth: []
 */
// Send an email to a specific person
// API body: {String} email (the singular email to send to), {String} subject : The subject line of the email, {String} htmlBody : The HTML content of the email.
subscriptionRouter.post(
    "/send-email/single",
    RoleChecker([Role.Enum.SUPER_ADMIN]),
    async (req, res) => {
        const { email, subject, htmlBody } = req.body;

        const sendEmailCommand = new SendEmailCommand({
            FromEmailAddress: process.env.FROM_EMAIL_ADDRESS ?? "",
            Destination: {
                ToAddresses: [email],
            },
            Content: {
                Simple: {
                    Subject: { Data: subject },
                    Body: { Html: { Data: htmlBody } },
                },
            },
        });

        await sesClient.send(sendEmailCommand);

        return res.status(StatusCodes.OK).send({ status: "success" });
    }
);

/**
 * @swagger
 * /subscription/{mailingList}:
 *   get:
 *     summary: Get email addresses for a mailing list
 *     description: |
 *       Returns the email addresses of all users subscribed to the given
 *       mailing list.
 *
 *       **Required roles: ADMIN**
 *     tags: [Subscription]
 *     parameters:
 *       - name: mailingList
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: rp_interest
 *     responses:
 *       200:
 *         description: List of subscriber email addresses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 format: email
 *               example: ["hacker@example.com", "volunteer@illinois.edu"]
 *       404:
 *         description: No subscribers found for this mailing list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "No subscribers found for this mailing list."
 *     security:
 *       - bearerAuth: []
 */
// Get all the emails in a specific mailing list
// Param: mailingList - the name of the mailing list to retrieve
subscriptionRouter.get(
    "/:mailingList",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { mailingList } = req.params;

        // Get all users subscribed to this mailing list
        const { data: subscriptions } = await SupabaseDB.SUBSCRIPTIONS.select(
            "userId"
        )
            .eq("mailingList", mailingList)
            .throwOnError();

        if (!subscriptions || subscriptions.length === 0) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "No subscribers found for this mailing list." });
        }

        // Get email addresses for all subscribed users (batch to avoid URL length limits)
        const userIds = subscriptions.map((sub) => sub.userId);
        const BATCH_SIZE = 100; // Process in smaller batches
        const emailAddresses: string[] = [];

        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            const batch = userIds.slice(i, i + BATCH_SIZE);
            const { data: users } = await SupabaseDB.AUTH_INFO.select("email")
                .in("userId", batch)
                .throwOnError();

            const batchEmails = users?.map((user) => user.email) || [];
            emailAddresses.push(...batchEmails);
        }

        return res.status(StatusCodes.OK).json(emailAddresses);
    }
);

/**
 * @swagger
 * /subscription/user/{userId}:
 *   get:
 *     summary: Get a user's mailing list subscriptions
 *     description: |
 *       Returns the names of all mailing lists the given user is subscribed to.
 *       Non-admin users may only query their own subscriptions.
 *
 *       **Required roles: USER | ADMIN**
 *     tags: [Subscription]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of mailing list names the user is subscribed to
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["rp_interest", "attendees"]
 *       403:
 *         description: Non-admin user attempting to query another user's subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "Access denied."
 *     security:
 *       - bearerAuth: []
 */
// Get a user's subscriptions
subscriptionRouter.get(
    "/user/:userId",
    RoleChecker([Role.Enum.USER, Role.Enum.ADMIN]),
    async (req, res) => {
        const { userId } = req.params;

        // Check if the user is requesting their own data or is an admin
        const payload = res.locals.payload;
        if (
            !payload.roles.includes(Role.Enum.ADMIN) &&
            payload.userId !== userId
        ) {
            return res
                .status(StatusCodes.FORBIDDEN)
                .json({ error: "Access denied." });
        }

        const { data: userSubscriptions } =
            await SupabaseDB.SUBSCRIPTIONS.select("mailingList")
                .eq("userId", userId)
                .throwOnError();

        const mailingLists =
            userSubscriptions?.map((sub) => sub.mailingList) || [];

        return res.status(StatusCodes.OK).json(mailingLists);
    }
);

/**
 * @swagger
 * /subscription/:
 *   delete:
 *     summary: Unsubscribe from a mailing list
 *     description: |
 *       Removes the given user's subscription from the specified mailing list.
 *       Non-admin users may only unsubscribe themselves.
 *
 *       **Required roles: USER | ADMIN**
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnsubscribeValidator'
 *     responses:
 *       200:
 *         description: Successfully unsubscribed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionSuccessResponse'
 *       403:
 *         description: Non-admin user attempting to unsubscribe another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "Access denied."
 *       404:
 *         description: Subscription not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "Subscription not found."
 *     security:
 *       - bearerAuth: []
 */
// Unsubscribe from a mailing list
subscriptionRouter.delete(
    "/",
    RoleChecker([Role.Enum.USER, Role.Enum.ADMIN]),
    async (req, res) => {
        const { userId, mailingList } = req.body;

        // Check if the user is unsubscribing themselves or is an admin
        const payload = res.locals.payload;
        if (
            !payload.roles.includes(Role.Enum.ADMIN) &&
            payload.userId !== userId
        ) {
            return res
                .status(StatusCodes.FORBIDDEN)
                .json({ error: "Access denied." });
        }

        // Check if the subscription exists
        const { data: existingSubscription } =
            await SupabaseDB.SUBSCRIPTIONS.select("userId, mailingList")
                .eq("userId", userId)
                .eq("mailingList", mailingList)
                .maybeSingle()
                .throwOnError();

        if (!existingSubscription) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "Subscription not found." });
        }

        // Delete the specific subscription
        await SupabaseDB.SUBSCRIPTIONS.delete()
            .eq("userId", userId)
            .eq("mailingList", mailingList)
            .throwOnError();

        return res.status(StatusCodes.OK).json({ status: "success" });
    }
);

export default subscriptionRouter;
