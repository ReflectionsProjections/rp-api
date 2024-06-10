import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
// import dotenv from "dotenv";
import { validateQrHash } from "../attendees/attendees-utils";

const adminRouter = Router();

adminRouter.post(
    "/scan/",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res, next) => {
        try {
            const { qrCode } = req.body;
            if (!qrCode) {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ error: "QR code is required" });
            }
            const { userId, expTime } = validateQrHash(qrCode);

            if (Date.now() / 1000 > expTime) {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "QR code has expired" });
            }

            const user = await Database.ATTENDEES.findOne({ userId });

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
