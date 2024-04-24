import { Router } from "express";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { NotificationsValidator } from "./notifications-schema";
import { Database } from "../../database";

const notificationsRouter = Router();

// Register user’s device identifier under their userId
notificationsRouter.post(
    "/", 
    RoleChecker([Role.enum.USER], false),
    async (req, res, next) => {
    try {
        const notificationEnrollmentData = NotificationsValidator.parse(req.body);

        // Upsert the user-device mapping info
        await Database.NOTIFICATIONS.findOneAndUpdate(
            { userId: notificationEnrollmentData.userId },
            { deviceId: notificationEnrollmentData.deviceId },
            { upsert: true, new: true }
        );

        return res.status(StatusCodes.OK).json(notificationEnrollmentData);

    } catch (error) {
        next(error);
    }
});

export default notificationsRouter;