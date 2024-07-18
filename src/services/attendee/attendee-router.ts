import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { AttendeeValidator, EventIdValidator } from "./attendee-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import dotenv from "dotenv";
import { generateQrHash } from "../checkin/checkin-utils";

dotenv.config();

const attendeeRouter = Router();

// Favorite an event for an attendee
attendeeRouter.post(
    "/favorites/:eventId",
    RoleChecker([Role.Enum.USER]),
    async (req, res, next) => {
        const payload = res.locals.payload;
        const userId = payload.userId;
        const { eventId } = EventIdValidator.parse(req.params);

        try {
            const attendee = await Database.ATTENDEE.findOne({ userId });

            if (!attendee) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }

            await Database.ATTENDEE.updateOne(
                { userId: userId },
                { $addToSet: { favorites: eventId } }
            );

            return res.status(StatusCodes.OK).json(attendee);
        } catch (error) {
            next(error);
        }
    }
);

// Unfavorite an event for an attendee
attendeeRouter.delete(
    "/favorites/:eventId",
    RoleChecker([Role.Enum.USER]),
    async (req, res, next) => {
        const payload = res.locals.payload;
        const userId = payload.userId;
        const { eventId } = EventIdValidator.parse(req.params);

        try {
            const attendee = await Database.ATTENDEE.findOne({ userId });

            if (!attendee) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }

            await Database.ATTENDEE.updateOne(
                { userId: userId },
                { $pull: { favorites: eventId } }
            );

            return res.status(StatusCodes.OK).json(attendee);
        } catch (error) {
            next(error);
        }
    }
);

// Get favorite events for an attendee
attendeeRouter.get(
    "/favorites",
    RoleChecker([Role.Enum.USER]),
    async (req, res, next) => {
        const payload = res.locals.payload;
        const userId = payload.userId;

        try {
            const attendee = await Database.ATTENDEE.findOne({ userId });

            if (!attendee) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }

            return res.status(StatusCodes.OK).json(attendee);
        } catch (error) {
            next(error);
        }
    }
);

// Create a new attendee
attendeeRouter.post("/", async (req, res, next) => {
    try {
        const attendeeData = AttendeeValidator.parse(req.body);
        const attendee = new Database.ATTENDEE(attendeeData);
        await attendee.save();

        return res.status(StatusCodes.CREATED).json(attendeeData);
    } catch (error) {
        next(error);
    }
});

// generates a unique QR code for each attendee
attendeeRouter.get(
    "/qr/",
    RoleChecker([Role.Enum.USER]),
    async (req, res, next) => {
        const payload = res.locals.payload;

        try {
            const userId = payload.userId;
            const expTime = Math.floor(Date.now() / 1000) + 20; // Current epoch time in seconds + 20 seconds
            const qrCodeString = generateQrHash(userId, expTime);
            return res.status(StatusCodes.OK).json({ qrCode: qrCodeString });
        } catch (error) {
            next(error);
        }
    }
);

attendeeRouter.get(
    "/points",
    RoleChecker([Role.Enum.USER]),
    async (req, res, next) => {
        try {
            const payload = res.locals.payload;
            const userId = payload.userId;

            // Check if the user exists in the database
            const user = await Database.ATTENDEE.findOne({ userId });

            if (!user) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }

            return res.status(StatusCodes.OK).json({ points: user.points });
        } catch (error) {
            next(error);
        }
    }
);

attendeeRouter.get(
    "/",
    RoleChecker([Role.Enum.USER]),
    async (req, res, next) => {
        try {
            const payload = res.locals.payload;
            const userId = payload.userId;

            // Check if the user exists in the database
            const user = await Database.ATTENDEE.findOne({ userId });

            if (!user) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }

            return res.status(StatusCodes.OK).json(user);
        } catch (error) {
            next(error);
        }
    }
);

export default attendeeRouter;
