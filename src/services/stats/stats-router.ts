import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const statsRouter = Router();

// Get the number of people checked in (staff only)
statsRouter.get(
    "/check-in",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res, next) => {
        try {
            const attendees = await Database.ATTENDEES.find({
                events: { $ne: [] },
            });

            return res.status(StatusCodes.OK).json({ count: attendees.length });
        } catch (error) {
            next(error);
        }
    }
);

// Get the number of people eligible for merch item (staff only)
statsRouter.get(
    "/merch-item/:PRICE",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res, next) => {
        try {
            const price = req.params.PRICE;
            if (!price) {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ error: "MissingPriceParameter" });
            }
            const attendees = await Database.ATTENDEES.find({
                points: { $gte: price },
            });

            return res.status(StatusCodes.OK).json({ count: attendees.length });
        } catch (error) {
            next(error);
        }
    }
);

// Get the number of priority attendees (staff only)
statsRouter.get(
    "/priority-attendee",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res, next) => {
        try {
            const currentTime = new Date();
            const attendees = await Database.ATTENDEES.find({
                priority_expiry: { $gt: currentTime },
            });

            return res.status(StatusCodes.OK).json({ count: attendees.length });
        } catch (error) {
            next(error);
        }
    }
);

// Get the attendance of the past n events (staff only)
statsRouter.get(
    "/attendance/:N",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res, next) => {
        try {
            const n = req.params.N;
            if (!n) {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ error: "MissingNParameter" });
            }
            const currentTime = new Date();
            const events = await Database.EVENTS.find({
                endTime: { $lt: currentTime },
            })
                .sort({ endTime: -1 })
                .limit(parseInt(n));

            const attendanceCounts = events.map(
                (event) => event.attendanceCount
            );

            return res
                .status(StatusCodes.OK)
                .json({ attendanceCounts: attendanceCounts });
        } catch (error) {
            next(error);
        }
    }
);

// Get the dietary restriction breakdown/counts (staff only)
statsRouter.get(
    "/dietary-restrictions",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res, next) => {
        try {
            const attendees = await Database.ATTENDEES.find({});
            let none = 0;
            let dietary_restrictions = 0;
            let allergies = 0;
            let both = 0;

            attendees.forEach((attendee) => {
                if (
                    attendee.dietary_restrictions.length > 0 &&
                    attendee.allergies.length > 0
                ) {
                    both++;
                } else if (attendee.dietary_restrictions.length > 0) {
                    dietary_restrictions++;
                } else if (attendee.allergies.length > 0) {
                    allergies++;
                } else {
                    none++;
                }
            });

            return res.status(StatusCodes.OK).json({
                none: none,
                dietary_restrictions: dietary_restrictions,
                allergies: allergies,
                both: both,
            });
        } catch (error) {
            next(error);
        }
    }
);

export default statsRouter;
