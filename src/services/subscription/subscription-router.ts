import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SubscriptionValidator } from "./subscription-schema";
import { SupabaseDB } from "../../supabase";
import cors from "cors";

const subscriptionRouter = Router();

// Create a new subscription
subscriptionRouter.post("/", cors(), async (req, res) => {
    // Validate the incoming user subscription
    const subscriptionData = SubscriptionValidator.parse(req.body);

    // normalize the email to prevent case sensitivity duplicates
    const lowerCaseEmail = subscriptionData.email.toLowerCase();

    const { mailing_list } = subscriptionData;

    const { data: list } = await SupabaseDB.SUBSCRIPTIONS.select(
        "subscriptions"
    )
        .eq("mailing_list", mailing_list)
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
                .eq("mailing_list", mailing_list)
                .throwOnError();
        }
    } else {
        // if the list was not found, we need to create it
        await SupabaseDB.SUBSCRIPTIONS.insert({
            mailing_list: mailing_list,
            subscriptions: [lowerCaseEmail],
        }).throwOnError();
    }

    return res.status(StatusCodes.CREATED).json(subscriptionData);
});

export default subscriptionRouter;
