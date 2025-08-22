import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SubscriptionValidator } from "./subscription-schema";
import { SupabaseDB } from "../../database";
import cors from "cors";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";


const subscriptionRouter = Router();

// Create a new subscription
subscriptionRouter.post("/", cors(), async (req, res) => {
    // Validate the incoming user subscription
    const subscriptionData = SubscriptionValidator.parse(req.body);

    // normalize the email to prevent case sensitivity duplicates
    const lowerCaseEmail = subscriptionData.email.toLowerCase();

    const { mailingList } = subscriptionData;

    const { data: list } = await SupabaseDB.SUBSCRIPTIONS.select(
        "subscriptions"
    )
        .eq("mailingList", mailingList)
        .maybeSingle()
        .throwOnError();

    if (list) {
        const subscriptions = list.subscriptions || [];

        // We only want to update if the email isn't in there already

        if (!subscriptions.includes(lowerCaseEmail)) {
            const updatedSubs = [...subscriptions, lowerCaseEmail];

            await SupabaseDB.SUBSCRIPTIONS.update({
                subscriptions: updatedSubs,
            })
                .eq("mailingList", mailingList)
                .throwOnError();
        }
    } else {
        // if the list was not found, we need to create it
        await SupabaseDB.SUBSCRIPTIONS.insert({
            mailingList: mailingList,
            subscriptions: [lowerCaseEmail],
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

        return res.status(StatusCodes.OK).json(subscriptions);
    }
);

// Send an email to a mailing list
// API body: {String} mailingList The list to send the email to, {String} subject The subject line of the email, {String} htmlBody The HTML content of the email.
subscriptionRouter.post(
    "/send-email",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const { mailingList, subject, htmlBody } = req.body;
        const { data: list } = await SupabaseDB.SUBSCRIPTIONS.select(
            "subscriptions"
        )
            .eq("mailingList", mailingList)
            .single()
            .throwOnError();

        const sesClient = new SESv2Client({
            region: process.env.AWS_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        const sendEmailCommand = new SendEmailCommand({
            FromEmailAddress: process.env.FROM_EMAIL_ADDRESS ?? "",
            Destination: {
                // SES can send to multiple addresses at once
                // ToAddresses: list.subscriptions,
                // Let's send to ourselves for now, and bcc everyone else, probably the most pro way to go about it.
                ToAddresses: [process.env.FROM_EMAIL_ADDRESS ?? ""],
                BccAddresses: list.subscriptions,
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

export default subscriptionRouter;
