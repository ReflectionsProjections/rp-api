import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SubscriptionValidator } from "./subscription-schema";
import { Database } from "../../database";
// import corsMiddleware from "../../middleware/cors-middleware";
import cors from "cors";

const subscriptionRouter = Router();

// Create a new subscription
subscriptionRouter.post("/", cors(), async (req, res) => {
    // Validate the incoming user subscription
    const subscriptionData = SubscriptionValidator.parse(req.body);

    // normalize the email to prevent case sensitivity duplicates
    const lowerCaseEmail = subscriptionData.email.toLowerCase();

    // Upsert the user info into the corresponding Subscription collection
    await Database.SUBSCRIPTIONS.findOneAndUpdate(
        { mailingList: subscriptionData.mailingList },
        { $addToSet: { subscriptions: lowerCaseEmail } },
        { upsert: true, new: true }
    );
    return res.status(StatusCodes.CREATED).json(subscriptionData);
});

export default subscriptionRouter;
