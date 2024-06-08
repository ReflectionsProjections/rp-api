import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { publicEventValidator } from "./events-schema";
import { Database } from "../../database";

const eventsRouter = Router();

// Get current or next event based on current time
eventsRouter.get("/currentOrNext", async (req, res, next) => {
    const currentTime = new Date();

    try {
        const event = await Database.EVENTS.findOne({
            startTime: { $gte: currentTime },
        }).sort({ startTime: 1 });

        if (event) {
            return res.status(StatusCodes.OK).json(event);
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
        const validatedData = publicEventValidator.parse(req.body);
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
        const unfiltered_event = await Database.EVENTS.findOne({
            eventId: eventId,
        });

        if (!unfiltered_event) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        const filtered_event = publicEventValidator.parse(unfiltered_event);

        return res.status(StatusCodes.OK).json(filtered_event);
    } catch (error) {
        next(error);
    }
});

// Get all events
eventsRouter.get("/", async (req, res, next) => {
    try {
        const unfiltered_events = await Database.EVENTS.find();
        const filtered_events = unfiltered_events.map((unfiltered_event) => {
            return publicEventValidator.parse(unfiltered_event.toJSON());
        });
        return res.status(StatusCodes.OK).json(filtered_events);
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
