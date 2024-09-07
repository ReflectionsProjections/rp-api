import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    AttendeeCreateValidator,
    EventIdValidator,
} from "./attendee-validators";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { generateQrHash, getCurrentDay } from "../checkin/checkin-utils";

import { decryptId } from "./attendee-utils";

import { generateJWT } from "../auth/auth-utils";
import Config from "../../config";

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
        const attendeeData = AttendeeCreateValidator.parse(req.body);
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
    "/foodwave",
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

            // check if true for cur day
            const day = getCurrentDay();
            let hasPriority = null;
            if (day === "Mon") {
                hasPriority = user.hasPriority.Mon;
            } else if (day === "Tue") {
                hasPriority = user.hasPriority.Tue;
            } else if (day === "Wed") {
                hasPriority = user.hasPriority.Wed;
            } else if (day === "Thu") {
                hasPriority = user.hasPriority.Thu;
            } else if (day === "Fri") {
                hasPriority = user.hasPriority.Fri;
            } else if (day === "Sat") {
                hasPriority = user.hasPriority.Sat;
            } else if (day === "Sun") {
                hasPriority = user.hasPriority.Sun;
            }

            const hasFoodRestrictions =
                user.dietaryRestrictions.length > 0 ||
                user.allergies.length > 0;
            const foodwave = hasPriority || hasFoodRestrictions ? 1 : 2;

            return res.status(StatusCodes.OK).json({ foodwave: foodwave });
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

attendeeRouter.post(
    "/redeemMerch/:ITEM",
    RoleChecker([]),
    async (req, res, next) => {
        try {
            const payload = res.locals.payload;
            const userId = payload.userId;
            const merchItem = req.params.ITEM;

            // Check if the user exists in the database
            const user = await Database.ATTENDEE.findOne({ userId });

            if (!user) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }

            if (
                merchItem == "Cap" ||
                merchItem == "Tote" ||
                merchItem == "Button"
            ) {
                if (!user.isEligibleMerch![merchItem]) {
                    return res
                        .status(StatusCodes.BAD_REQUEST)
                        .json({ error: "Too few points" });
                } else if (user.hasRedeemedMerch![merchItem]) {
                    return res
                        .status(StatusCodes.BAD_REQUEST)
                        .json({ error: "Item already redeemed" });
                } else {
                    await Database.ATTENDEE.updateOne(
                        { userId },
                        { $set: { [`hasRedeemedMerch.${merchItem}`]: true } }
                    );

                    return res
                        .status(StatusCodes.OK)
                        .json({ message: "Item Redeemed!" });
                }
            } else {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ error: "Not a valid item" });
            }
        } catch (error) {
            next(error);
        }
    }
);

attendeeRouter.get("/resume/update/:ENCODED_ID", async (req, res) => {
    const ENCODED_ID = req.params.ENCODED_ID;
    const decrypted_id = await decryptId(ENCODED_ID);
    const token = await generateJWT(decrypted_id);
    const uploadURL = Config.WEB_RESUME_REUPLOAD_ROUTE + `?token=${token}`;
    return res.redirect(uploadURL);
});

export default attendeeRouter;
