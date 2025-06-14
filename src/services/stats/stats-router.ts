import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { getCurrentDay } from "../checkin/checkin-utils";
import { z } from "zod";

const statsRouter = Router();

// Get the number of people checked in (staff only)
statsRouter.get(
    "/check-in",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const attendees = await Database.ATTENDEE.find({
            hasCheckedIn: true,
        });

        return res.status(StatusCodes.OK).json({ count: attendees.length });
    }
);

// Get the number of people eligible for merch item (staff only)
statsRouter.get(
    "/merch-item/:PRICE",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const schema = z.object({
            PRICE: z.coerce
                .number()
                .int()
                .gte(0, { message: "PRICE must be non-negative" }),
        });

        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: result.error.errors[0].message,
            });
        }

        const price = result.data.PRICE;

        const attendees = await Database.ATTENDEE.find({
            points: { $gte: price },
        });

        return res.status(StatusCodes.OK).json({ count: attendees.length });
    }
);

// Get the number of priority attendees (staff only)
statsRouter.get(
    "/priority-attendee",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const day = getCurrentDay();
        const dayField = `hasPriority.${day}`;
        const attendees = await Database.ATTENDEE.find({
            [dayField]: true,
        });

        return res.status(StatusCodes.OK).json({ count: attendees.length });
    }
);

// Get the attendance of the past n events (staff only)
statsRouter.get(
    "/attendance/:N",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const schema = z.object({
            N: z.coerce
                .number()
                .int()
                .gt(0, { message: "N must be greater than 0" }),
        });

        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: result.error.errors[0].message,
            });
        }
        const numEvents = result.data.N;
        const currentTime = new Date();
        const events = await Database.EVENTS.find({
            endTime: { $lt: currentTime },
        })
            .sort({ endTime: -1 })
            .limit(numEvents);

        const attendanceCounts = events.map((event) => event.attendanceCount);

        return res.status(StatusCodes.OK).json({ attendanceCounts });
    }
);

// Get the dietary restriction breakdown/counts (staff only)
statsRouter.get(
    "/dietary-restrictions",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const results = await Promise.allSettled([
            Database.ATTENDEE.countDocuments({
                allergies: { $size: 0 },
                dietaryRestrictions: { $size: 0 },
            }),
            Database.ATTENDEE.countDocuments({
                allergies: { $size: 0 },
                dietaryRestrictions: { $ne: [] },
            }),
            Database.ATTENDEE.countDocuments({
                allergies: { $ne: [] },
                dietaryRestrictions: { $size: 0 },
            }),
            Database.ATTENDEE.countDocuments({
                allergies: { $ne: [] },
                dietaryRestrictions: { $ne: [] },
            }),
            Database.ATTENDEE.aggregate([
                {
                    $unwind: "$allergies",
                },
                {
                    $group: {
                        _id: "$allergies",
                        count: { $sum: 1 },
                    },
                },
            ]),
            Database.ATTENDEE.aggregate([
                {
                    $unwind: "$dietaryRestrictions",
                },
                {
                    $group: {
                        _id: "$dietaryRestrictions",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        for (let i = 0; i < results.length; i++) {
            if (results[i].status === "rejected") {
                return res
                    .status(StatusCodes.INTERNAL_SERVER_ERROR)
                    .send({ error: "InternalError" });
            }
        }

        type mongoQueryType = {
            _id: string;
            count: number;
        };
        const allergyCounts: { [key: string]: number } = {};
        const unprocessedAllergyCounts = (
            results[4] as PromiseFulfilledResult<mongoQueryType[]>
        ).value;
        for (let i = 0; i < unprocessedAllergyCounts.length; i++) {
            allergyCounts[unprocessedAllergyCounts[i]._id as string] =
                unprocessedAllergyCounts[i].count;
        }
        const dietaryRestrictionCounts: { [key: string]: number } = {};
        const unprocessedDietaryRestrictionCountss = (
            results[5] as PromiseFulfilledResult<mongoQueryType[]>
        ).value;
        for (let i = 0; i < unprocessedDietaryRestrictionCountss.length; i++) {
            dietaryRestrictionCounts[
                unprocessedDietaryRestrictionCountss[i]._id as string
            ] = unprocessedDietaryRestrictionCountss[i].count;
        }

        return res.status(StatusCodes.OK).json({
            none: (results[0] as PromiseFulfilledResult<number>).value,
            dietaryRestrictions: (results[1] as PromiseFulfilledResult<number>)
                .value,
            allergies: (results[2] as PromiseFulfilledResult<number>).value,
            both: (results[3] as PromiseFulfilledResult<number>).value,
            allergyCounts: allergyCounts,
            dietaryRestrictionCounts: dietaryRestrictionCounts,
        });
    }
);

export default statsRouter;
