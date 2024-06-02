import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { AttendeeSchema } from "../attendees/attendee-schema";
import mongoose from "mongoose";

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
                priorityExpiry: { $gt: currentTime },
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
            const numEvents = req.params.N;
            if (!numEvents) {
                return res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ error: "MissingNParameter" });
            }
            const currentTime = new Date();
            const events = await Database.EVENTS.find({
                endTime: { $lt: currentTime },
            })
                .sort({ endTime: -1 })
                .limit(parseInt(numEvents));

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
            let dietaryRestrictions = 0; // Gluten-Free, Lactose-Intolerant, No Pork, No Beef, No Fish, Halal, Vegetarian, Vegan, Diabetes
            let allergies = 0; // Milk, Eggs, Tree nuts, Peanuts, Shellfish, Fish, Soy, Wheat, Sesame
            let both = 0;
            const dietaryRestrictionCounts: { [key: string]: number } = {};
            const allergyCounts: { [key: string]: number } = {};

            attendees.forEach((attendee) => {
                if (
                    attendee.dietaryRestrictions.length > 0 &&
                    attendee.allergies.length > 0
                ) {
                    both++;
                } else if (attendee.dietaryRestrictions.length > 0) {
                    dietaryRestrictions++;
                } else if (attendee.allergies.length > 0) {
                    allergies++;
                } else {
                    none++;
                }

                const attendeeDietaryRestrictions: string[] =
                    attendee.dietaryRestrictions;
                attendeeDietaryRestrictions.forEach((dietaryRestriction) => {
                    if (dietaryRestrictionCounts[dietaryRestriction]) {
                        dietaryRestrictionCounts[dietaryRestriction]++;
                    } else {
                        dietaryRestrictionCounts[dietaryRestriction] = 1;
                    }
                });

                const attendeeAllergies: string[] = attendee.allergies;
                attendeeAllergies.forEach((allergies) => {
                    if (allergyCounts[allergies]) {
                        allergyCounts[allergies]++;
                    } else {
                        allergyCounts[allergies] = 1;
                    }
                });
            });

            return res.status(StatusCodes.OK).json({
                none: none,
                dietaryRestrictions: dietaryRestrictions,
                allergies: allergies,
                both: both,
                allergyCounts: allergyCounts,
                dietaryRestrictionCounts: dietaryRestrictionCounts,
            });
        } catch (error) {
            next(error);
        }
    }
);

statsRouter.get(
    "/test",
    RoleChecker([Role.enum.STAFF], true),
    async (req, res, next) => {
        try {
            const Attendee = mongoose.model("Attendee", AttendeeSchema);
            const exampleAttendee = new Attendee({
                userId: "12345",
                name: "John Doe",
                email: "john.doe@example.com",
                dietaryRestrictions: ["Vegan"],
                allergies: ["Peanuts"],
            });
            console.log(exampleAttendee);
            return res.status(StatusCodes.OK);
        } catch (error) {
            next(error);
        }
    }
);

export default statsRouter;
