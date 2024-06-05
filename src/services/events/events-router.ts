import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { EventValidator } from "./events-schema";
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
        const validatedData = EventValidator.parse(req.body);
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
        const validatedData = EventValidator.parse(req.body);
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

eventsRouter.post("/check-in", async (req, res, next) => {
    try {
        const { eventId, userId } = req.body;

        // Check if the event and attendee exist
        const event = await Database.EVENTS.findOne({ eventId });
        const attendee = await Database.ATTENDEES.findOne({ userId });
        console.log(event);
        console.log(attendee);

        if (!event || !attendee) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "Event or Attendee not found" });
        }

        const eventAttendance = await Database.EVENTS_ATT.findOne({ eventId });
        if (!eventAttendance) {
            const newEventAttendance = await Database.EVENTS_ATT.create({
                eventId: eventId,
                attendees: [userId],
            });
            await newEventAttendance.save();
        } else {
            eventAttendance.attendees.push(userId);
            await eventAttendance.save();
        }

        const attendeeAttendance = await Database.ATTENDEES_ATT.findOne({
            userId,
        });
        if (!attendeeAttendance) {
            const newAttendeeAttendance = new Database.ATTENDEES_ATT({
                userId: userId,
                eventsAttended: [eventId],
            });
            await newAttendeeAttendance.save();
        } else {
            attendeeAttendance.eventsAttended.push(eventId);
            await attendeeAttendance.save();
        }

        return res
            .status(StatusCodes.OK)
            .json({ message: "Check-in successful" });
    } catch (error) {
        next(error);
    }
});

export default eventsRouter;
