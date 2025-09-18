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

// Get a list of all subscriptions - envisioning that admins can use this as dropdown to choose who to send emails to
subscriptionRouter.get(
    "/",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { data: subscriptions } =
            await SupabaseDB.SUBSCRIPTIONS.select("*").throwOnError();

        const aggregated =
            subscriptions?.reduce(
                (acc, subscription) => {
                    const existing = acc.find(
                        (item) => item.mailingList === subscription.mailingList
                    );
                    if (existing) {
                        existing.userIds.push(subscription.userId);
                    } else {
                        acc.push({
                            mailingList: subscription.mailingList,
                            userIds: [subscription.userId],
                        });
                    }
                    return acc;
                },
                [] as { mailingList: string; userIds: string[] }[]
            ) || [];

        return res.status(StatusCodes.OK).json(aggregated);
    }
);

// Send an email to a mailing list
// API body: {String} mailingList The list to send the email to, {String} subject The subject line of the email, {String} htmlBody The HTML content of the email.
subscriptionRouter.post(
    "/send-email",
    RoleChecker([Role.Enum.ADMIN]),
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

// Send an email to a specific person
// API body: {String} email (the singular email to send to), {String} subject : The subject line of the email, {String} htmlBody : The HTML content of the email.
subscriptionRouter.post(
    "/send-email/single",
    RoleChecker([Role.Enum.ADMIN]),
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
