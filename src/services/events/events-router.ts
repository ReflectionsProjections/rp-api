import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { EventValidator } from "./events-schema";
import { Database } from "../../database";

const eventsRouter = Router();

eventsRouter.post("/", async (req, res, next) => {
    try {
        const validatedData = EventValidator.parse(req.body);
        const event = new Database.EVENTS(validatedData);
        await event.save();
        return res.status(StatusCodes.CREATED).json(event.toObject());
    } catch (error) {
        next(error);
    }
});

eventsRouter.get("/:eventId", async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const event = await Database.EVENTS.findOne({ eventId: eventId });

        if (!event) {
            return { error: "Event not found" };
        }
        return res.status(StatusCodes.OK).json(event.toObject());
    } catch (error) {
        next(error);
    }
});

eventsRouter.get("/", async (req, res, next) => {
    try {
        const events = await Database.EVENTS.find({});

        if (!events) {
            return { error: "No events" };
        }
        return res.status(StatusCodes.OK).json(events);
    } catch (error) {
        next(error);
    }
});

export default eventsRouter;
