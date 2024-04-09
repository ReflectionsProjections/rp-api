import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { EventValidator } from "./event-schema";
import { Database } from "../../database";

const eventRouter = Router();

// Create a new event
eventRouter.post("/", async (req, res) => {
    try {
        const eventData = EventValidator.parse(req.body);
        const event = new Database.EVENTS(eventData);
        await event.save();
        return res.status(StatusCodes.CREATED).json(event);
    } catch (error) {
        console.error("Error:", error);
        return res
            .status(StatusCodes.BAD_REQUEST)
            .send("Error creating event.");
    }
});

// Get all events
eventRouter.get("/", async (req, res) => {
    try {
        const events = await Database.EVENTS.find();
        return res.status(StatusCodes.OK).json(events);
    } catch (error) {
        console.error("Error:", error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Internal server error.");
    }
});

// Get event by ID
eventRouter.get("/:id", async (req, res) => {
    try {
        const event = await Database.EVENTS.findById(req.params.id);
        if (!event) {
            return res.status(StatusCodes.NOT_FOUND).send("Event not found.");
        }
        return res.status(StatusCodes.OK).json(event);
    } catch (error) {
        console.error("Error:", error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Internal server error.");
    }
});

// Update event
eventRouter.patch("/:id", async (req, res) => {
    try {
        const event = await Database.EVENTS.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!event) {
            return res.status(StatusCodes.NOT_FOUND).send("Event not found.");
        }

        return res.status(StatusCodes.OK).json(event);
    } catch (error) {
        console.error("Error:", error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Internal server error.");
    }
});

// Delete event
eventRouter.delete("/:id", async (req, res) => {
    try {
        const event = await Database.EVENTS.findByIdAndDelete(req.params.id);
        if (!event) {
            return res.status(StatusCodes.NOT_FOUND).send("Event not found.");
        }
        return res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
        console.error("Error:", error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send("Internal server error.");
    }
});

export default eventRouter;
