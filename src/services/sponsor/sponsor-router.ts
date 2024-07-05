import { Router } from "express";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";

const sponsorRouter = Router();

// Get favorite events for an attendee
sponsorRouter.get(
    "/",
    RoleChecker([Role.Enum.CORPORATE]),
    async (req, res, next) => {
        try {
            const resumeUsers = await Database.REGISTRATION.find(
                { hasResume: true },
                { userId: 1 }
            );

            if (!resumeUsers) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "UserNotFound" });
            }

            return res.status(StatusCodes.OK).json(resumeUsers);
        } catch (error) {
            next(error);
        }
    }
);

export const sponsorRouter;
