import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { AttendeeValidator } from "./attendee-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import crypto from "crypto";
import { getEnv } from "../../utilities";
import dotenv from "dotenv";

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
// Role.Enum.USER
attendeeRouter.get("/qr/", RoleChecker([]), async (req, res, next) => {
    const payload = res.locals.payload;

    try {
        const userId = payload.userId;
        const expTime = Math.floor(Date.now() / 1000) + 20; // Current epoch time in seconds + 20 seconds
        let hashStr = userId + "#" + expTime;
        const hashIterations = Number(getEnv("QR_HASH_ITERATIONS"));
        const hashSecret = getEnv("QR_HASH_SECRET");

        const hmac = crypto.createHmac("sha256", hashSecret);
        hashStr = hmac.update(hashStr).digest("hex");

        for (let i = 0; i < hashIterations; i++) {
            const hash = crypto.createHash("sha256");
            hashStr = hash.update(hashSecret + "#" + hashStr).digest("hex");
        }

        const qrCodeString = `${hashStr}#${expTime}#${userId}`;
        return res.status(StatusCodes.OK).json({ qrCode: qrCodeString });
    } catch (error) {
        next(error);
    }
});

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
