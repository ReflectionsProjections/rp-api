import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SubscriptionValidator } from "./subscription-schema";
import { Database } from "../../database";

const subscriptionRouter = Router();

// Create a new subscription
subscriptionRouter.post("/subscribe", async (req, res, next) => {
    try {
        const subscriptionData = SubscriptionValidator.parse(req.body);
        await Database.SUBSCRIPTION.create(subscriptionData);
        return res.status(StatusCodes.CREATED).json(subscriptionData);
    } catch (error) {
        next(error);
    }
});

export default subscriptionRouter;
