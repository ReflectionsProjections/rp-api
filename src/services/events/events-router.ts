import { Router } from "express";
import { Database } from "../../database";
import { StatusCodes } from "http-status-codes";
import { createId } from "@paralleldrive/cuid2";
import { Event, EventValidator } from "./events-schema";

const eventRouter = Router();
// authRouter.get("/", async (req, res) => {
// });

eventRouter.post("/events", async (req, res, next) => {
    try {
        const validatedData = EventValidator.parse(req.body);
        const event = new Event(validatedData);
        await event.save();
        return res.status(StatusCodes.CREATED).json(event);
    } catch (error) {
        next(error);
    }
});

export default eventRouter;
