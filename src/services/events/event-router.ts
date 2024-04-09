import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { EventValidator } from "./event-schema";
import { Database } from "../../database";

const eventRouter = Router();

// Create a new event
eventRouter.post("/", async (req, res, next) => {
    try {
        const eventData = EventValidator.parse(req.body);
        const event = new Database.EVENTS(eventData);
        await event.save();
        return res.status(StatusCodes.CREATED).json(event);
    } catch (error) {
        next(error);
    }
});

// Get all events
eventRouter.get("/", async (req, res, next) => {
    try {
        const events = await Database.EVENTS.find();
        return res.status(StatusCodes.OK).json(events);
    } catch (error) {
        next(error);
    }
});

// Get event by ID
eventRouter.get("/:id", async (req, res, next) => {
    try {
        const event = await Database.EVENTS.findOneAndUpdate(
            { _id: req.params.id },
            { new: true }
        );

        if (!event) {
            return { error: "DoesNotExist" };
        }

        return res.status(StatusCodes.OK).json(event);
    } catch (error) {
        next(error);
    }
});

// Update event
eventRouter.patch("/:id", async (req, res, next) => {
    try {
        const event = await Database.EVENTS.findOneAndUpdate(
            { _id: req.params.id },
            req.body,
            { new: true }
        );

        if (!event) {
            return { error: "DoesNotExist" };
        }

        return res.status(StatusCodes.OK).json(event);
    } catch (error) {
        next(error);
    }
});

// Delete event
eventRouter.delete("/:id", async (req, res, next) => {
    try {
        const event = await Database.EVENTS.findByIdAndDelete(req.params.id);

        if (!event) {
            return { error: "DoesNotExist" };
        }

        return res.status(StatusCodes.OK).json(event);
    } catch (error) {
        next(error);
    }
});

export default eventRouter;
