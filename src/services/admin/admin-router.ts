import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { ScanValidator } from "./admin-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
// import dotenv from "dotenv";
import { validateQrHash } from "../attendee/attendee-utils";

const adminRouter = Router();

adminRouter.post(
    "/checkin/scan/staff",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            const { eventId, qrCode } = ScanValidator.parse(req.body);
            console.log("Event ID:", eventId);

            const { userId, expTime } = validateQrHash(qrCode);

            if (Date.now() / 1000 > expTime) {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "QR code has expired" });
            }

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

export default adminRouter;
