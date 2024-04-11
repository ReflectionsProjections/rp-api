import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { EventValidator } from "./events-schema";
import { Database } from "../../database";

const eventRouter = Router();

eventRouter.post("/", async (req, res, next) => {
    try {
        const validatedData = EventValidator.parse(req.body);
        const event = new Database.EVENTS(validatedData);
        await event.save();
        return res.status(StatusCodes.CREATED).json(event.toObject());
    } catch (error) {
        next(error);
    }
});

export default eventRouter;
