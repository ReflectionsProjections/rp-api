import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { ScanValidator } from "./checkin-schema";
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

            await checkInUserToEvent(eventId, userId, true);

            return res.status(StatusCodes.OK).json(userId);
        } catch (error) {
            next(error);
        }
    }
);

checkinRouter.post(
    "/main",
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
            if (attendee.hasCheckedIn === true) {
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
