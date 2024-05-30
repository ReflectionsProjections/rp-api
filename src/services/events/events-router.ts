import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { EventValidator } from "./events-schema";
import { Database } from "../../database";

const eventsRouter = Router();

// Get current or next event based on current time
eventsRouter.get("/currentOrNext", async (req, res, next) => {
    const currentTime = new Date();

    try {
        const events = await Database.EVENTS.find().sort({ startTime: 1 });
        let currentEvent = null;
        let nextEvent = null;

        for (const event of events) {
            const startTime: Date = event.startTime as Date;
            const endTime: Date = event.endTime as Date;

            if (startTime <= currentTime && endTime >= currentTime) {
                currentEvent = event;
                break;
            } else if (startTime > currentTime) {
                nextEvent = event;
                break;
            }
        }

        if (currentEvent) {
            return res.status(StatusCodes.OK).json(currentEvent);
        } else if (nextEvent) {
            return res.status(StatusCodes.OK).json(nextEvent);
        } else {
            return res
                .status(StatusCodes.NO_CONTENT)
                .json({ error: "DoesNotExist" });
        }
    } catch (error) {
        next(error);
    }
});

eventsRouter.post("/", async (req, res, next) => {
    try {
        const validatedData = EventValidator.parse(req.body);
        const event = new Database.EVENTS(validatedData);
        await event.save();
        return res.sendStatus(StatusCodes.CREATED);
    } catch (error) {
        next(error);
    }
});

eventsRouter.get("/:EVENTID", async (req, res, next) => {
    const eventId = req.params.EVENTID;
    try {
        const event = await Database.EVENTS.findOne({ eventId: eventId });

        if (!event) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        return res.status(StatusCodes.OK).json(event.toObject());
    } catch (error) {
        next(error);
    }
});

// Get all events
eventsRouter.get("/", async (req, res, next) => {
    try {
        const events = await Database.EVENTS.find();
        return res.status(StatusCodes.OK).json(events);
    } catch (error) {
        next(error);
    }
});

// Delete event
eventsRouter.delete("/:EVENTID", async (req, res, next) => {
    const eventId = req.params.EVENTID;
    try {
        await Database.EVENTS.findByIdAndDelete({ eventId: eventId });

        return res.sendStatus(StatusCodes.NO_CONTENT);
    } catch (error) {
        next(error);
    }
});

export default eventsRouter;
