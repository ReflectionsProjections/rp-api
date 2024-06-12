import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { publicEventValidator } from "./events-schema";
import { Database } from "../../database";
import { checkInUser } from "./events-utils";
// import {mongoose} from "mongoose";

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

eventsRouter.put("/:EVENTID", async (req, res, next) => {
    const eventId = req.params.EVENTID;
    try {
        const validatedData = publicEventValidator.parse(req.body);
        const event = await Database.EVENTS.findOne({ eventId: eventId });

        if (!event) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        Object.assign(event, validatedData);
        await event.save();
        return res.sendStatus(StatusCodes.OK);
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
        // const objectId = mongoose.Types.ObjectId(eventId)
        await Database.EVENTS.findOneAndDelete({ eventId: eventId });

        return res.sendStatus(StatusCodes.NO_CONTENT);
    } catch (error) {
        next(error);
    }
});

eventsRouter.post("/check-in", async (req, res, next) => {
    try {
        const { eventId, userId } = req.body;
        const result = await checkInUser(eventId, userId);
        if (result.success) {
            return res
                .status(StatusCodes.OK)
                .json({ message: "Check-in successful" });
        } else {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: result.message });
        }
    } catch (error) {
        next(error);
    }
});

export default eventsRouter;
