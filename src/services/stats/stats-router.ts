import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";
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
        const { data: checkinEvents } = await SupabaseDB.EVENTS.select(
            "eventId"
        )
            .eq("eventType", "CHECKIN")
            .throwOnError();

        if (!checkinEvents || checkinEvents.length === 0) {
            return res.status(StatusCodes.OK).json({ count: 0 });
        }

        const checkinEventIds = checkinEvents.map((event) => event.eventId);

        const { data: attendanceRecords } =
            await SupabaseDB.EVENT_ATTENDANCES.select("attendee")
                .in("eventId", checkinEventIds)
                .throwOnError();

        const uniqueAttendees = new Set(
            attendanceRecords?.map((record) => record.attendee) || []
        );

        return res.status(StatusCodes.OK).json({
            count: uniqueAttendees.size,
        });
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

        const { count } = await SupabaseDB.ATTENDEES.select("*", {
            count: "exact",
            head: true,
        })
            .gte("points", price)
            .throwOnError();

        return res.status(StatusCodes.OK).json({ count: count || 0 });
    }
);

// Get the number of priority attendees (staff only)
statsRouter.get(
    "/priority-attendee",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const day = getCurrentDay();

        const dayFieldMap: Record<string, string> = {
            Mon: "hasPriorityMon",
            Tue: "hasPriorityTue",
            Wed: "hasPriorityWed",
            Thu: "hasPriorityThu",
            Fri: "hasPriorityFri",
            Sat: "hasPrioritySat",
            Sun: "hasPrioritySun",
        };

        const postgresField = dayFieldMap[day];

        const { count } = await SupabaseDB.ATTENDEES.select("*", {
            count: "exact",
            head: true,
        })
            .eq(postgresField, true)
            .throwOnError();

        return res.status(StatusCodes.OK).json({ count: count || 0 });
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

        const { data: events } = await SupabaseDB.EVENTS.select(
            "attendanceCount"
        )
            .lt("endTime", currentTime.toISOString())
            .order("endTime", { ascending: false })
            .limit(numEvents)
            .throwOnError();

        const attendanceCounts =
            events?.map((event) => event.attendanceCount) || [];

        return res.status(StatusCodes.OK).json({ attendanceCounts });
    }
);

// Get the dietary restriction breakdown/counts (staff only)
statsRouter.get(
    "/dietary-restrictions",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const [
            { count: noneCount },
            { count: dietaryOnlyCount },
            { count: allergiesOnlyCount },
            { count: bothCount },
            { data: allergiesData },
            { data: dietaryRestrictionsData },
        ] = await Promise.all([
            // None: empty arrays for both allergies and dietaryRestrictions
            SupabaseDB.REGISTRATIONS.select("*", { count: "exact", head: true })
                .filter("allergies", "eq", "{}")
                .filter("dietaryRestrictions", "eq", "{}")
                .throwOnError(),

            // Dietary restrictions only: empty allergies, non-empty dietaryRestrictions
            SupabaseDB.REGISTRATIONS.select("*", { count: "exact", head: true })
                .filter("allergies", "eq", "{}")
                .filter("dietaryRestrictions", "neq", "{}")
                .throwOnError(),

            // Allergies only: non-empty allergies, empty dietaryRestrictions
            SupabaseDB.REGISTRATIONS.select("*", { count: "exact", head: true })
                .filter("allergies", "neq", "{}")
                .filter("dietaryRestrictions", "eq", "{}")
                .throwOnError(),

            // Both: non-empty arrays for both
            SupabaseDB.REGISTRATIONS.select("*", { count: "exact", head: true })
                .filter("allergies", "neq", "{}")
                .filter("dietaryRestrictions", "neq", "{}")
                .throwOnError(),

            // Get all allergies to count individual types
            SupabaseDB.REGISTRATIONS.select("allergies")
                .filter("allergies", "neq", "{}")
                .throwOnError(),

            // Get all dietary restrictions to count individual types
            SupabaseDB.REGISTRATIONS.select("dietaryRestrictions")
                .filter("dietaryRestrictions", "neq", "{}")
                .throwOnError(),
        ]);

        const allergyCounts: { [key: string]: number } = {};
        allergiesData?.forEach((registration) => {
            registration.allergies?.forEach((allergy: string) => {
                allergyCounts[allergy] = (allergyCounts[allergy] || 0) + 1;
            });
        });

        const dietaryRestrictionCounts: { [key: string]: number } = {};
        dietaryRestrictionsData?.forEach((registration) => {
            registration.dietaryRestrictions?.forEach((restriction: string) => {
                dietaryRestrictionCounts[restriction] =
                    (dietaryRestrictionCounts[restriction] || 0) + 1;
            });
        });

        return res.status(StatusCodes.OK).json({
            none: noneCount || 0,
            dietaryRestrictions: dietaryOnlyCount || 0,
            allergies: allergiesOnlyCount || 0,
            both: bothCount || 0,
            allergyCounts,
            dietaryRestrictionCounts,
        });
    }
);

export default statsRouter;
