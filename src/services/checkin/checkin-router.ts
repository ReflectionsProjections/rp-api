import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    ScanValidator,
    MerchScanValidator,
    EventValidator,
} from "./checkin-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { validateQrHash } from "./checkin-utils";
import { checkInUserToEvent } from "./checkin-utils";
import { Database } from "../../database";

const checkinRouter = Router();

checkinRouter.post(
    "/scan/staff",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res, next) => {
        try {
            const { eventId, qrCode } = ScanValidator.parse(req.body);

            const { userId, expTime } = validateQrHash(qrCode);

            if (Date.now() / 1000 > expTime) {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "QR code has expired" });
            }

            try {
                await checkInUserToEvent(eventId, userId);
            } catch (error: any) {
                if (error instanceof Error && error.message == "IsDuplicate") {
                    return res
                        .status(StatusCodes.FORBIDDEN)
                        .json({ error: "IsDuplicate" });
                }
                return res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
            }

            return res.status(StatusCodes.OK).json(userId);
        } catch (error) {
            next(error);
        }
    }
);

checkinRouter.post(
    "/event",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res, next) => {
        try {
            const { eventId, userId, isCheckin } = EventValidator.parse(
                req.body
            );

            await checkInUserToEvent(eventId, userId, isCheckin);

            return res.status(StatusCodes.OK).json(userId);
        } catch (error) {
            next(error);
        }
    }
);

checkinRouter.post(
    "/scan/merch",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res, next) => {
        try {
            const { qrCode } = MerchScanValidator.parse(req.body);

            const { userId, expTime } = validateQrHash(qrCode);

            if (Date.now() / 1000 > expTime) {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "QR code has expired" });
            }

            return res.status(StatusCodes.OK).json(userId);
        } catch (error) {
            next(error);
        }
    }
);

checkinRouter.post(
    "/",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.STAFF]),
    async (req, res, next) => {
        try {
            const { qrCode } = ScanValidator.parse(req.body);

            const { userId, expTime } = validateQrHash(qrCode);

            if (Date.now() / 1000 > expTime) {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "QR code has expired" });
            }

            const attendee = await Database.ATTENDEE.findOne({ userId });
            if (!attendee) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }
            if (attendee.hasCheckedIn) {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ error: "AlreadyCheckedIn" });
            }
            await Database.ATTENDEE.updateOne(
                { userId: userId },
                { $set: { hasCheckedIn: true } }
            );

            return res.status(StatusCodes.OK).json(userId);
        } catch (error) {
            next(error);
        }
    }
);

export default checkinRouter;
