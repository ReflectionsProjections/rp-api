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

// eventRouter.get("/:eventId", async (req, res, next) => {
//     try {
//         const { eventId } = req.params; // Extract eventId from URL parameters
//         const event = await Database.EVENTS.findOne({ eventId: eventId });
//         if (!event) {
//             return res.status(404).json({ message: "Event not found." });
//         }
//         return res.status(StatusCodes.OK).json(event.toObject());
//     } catch (error) {
//         next(error);
//     }
// });

eventRouter.get("/:eventId", async (req, res, next) => {
    try {
        const event = await Database.EVENTS.findOneAndUpdate({
            eventId: req.params,
        });

        if (!event) {
            return { error: "DoesNotExist" };
        }

        return res.status(StatusCodes.OK).json(event);
    } catch (error) {
        next(error);
    }
});

export default eventRouter;
