import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { AttendeeValidator } from "./attendee-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import crypto from "crypto";
import dotenv from "dotenv";
import { Config } from "../../config";
import { generateQrHash } from "./attendees-utils";

dotenv.config();

const attendeeRouter = Router();

// Create a new attendee
attendeeRouter.post("/", async (req, res, next) => {
    try {
        const attendeeData = AttendeeValidator.parse(req.body);
        const attendee = new Database.ATTENDEES(attendeeData);
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

// Check if a user email exists
attendeeRouter.get("/:email", async (req, res, next) => {
    try {
        const { email } = req.params;

        // Check if the user exists in the database
        const userExists = await Database.ATTENDEES.exists({ email });

        if (!userExists) {
            return { error: "DoesNotExist" };
        }

        const user = await Database.ATTENDEES.findOne({
            email,
        });

        return res.status(StatusCodes.OK).json(user);
    } catch (error) {
        next(error);
    }
});

export default attendeeRouter;
