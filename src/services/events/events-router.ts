import { Router } from "express";
import { Database } from "../../database";
import { StatusCodes } from "http-status-codes";
import { createId } from "@paralleldrive/cuid2";
import { Event, EventInfo } from "./events-schema";

const authRouter = Router();
// authRouter.get("/", async (req, res) => {
// });

authRouter.post("/events", async (req, res, next) => {
    try {
        const validatedData = EventInfo.parse(req.body);
        const event = new Event(validatedData);
        await event.save();
        return res.status(StatusCodes.CREATED).json(event);
    } catch (error) {
        next(error);
    }
});

export default authRouter;
