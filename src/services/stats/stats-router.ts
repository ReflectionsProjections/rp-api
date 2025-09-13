import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB, TierType } from "../../database";
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

        const checkinEventIds = checkinEvents.map(
            (event: { eventId: string }) => event.eventId
        );

        const { data: attendanceRecords } =
            await SupabaseDB.EVENT_ATTENDANCES.select("attendee")
                .in("eventId", checkinEventIds)
                .throwOnError();

        const uniqueAttendees = new Set(
            attendanceRecords?.map(
                (record: { attendee: string }) => record.attendee
            ) || []
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
            events?.map(
                (event: { attendanceCount: number }) => event.attendanceCount
            ) || [];

        return res.status(StatusCodes.OK).json({ attendanceCounts });
    }
);

// Get the dietary restriction breakdown/counts (staff only)
statsRouter.get(
    "/dietary-restrictions",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const { data: allRegistrations } =
            await SupabaseDB.REGISTRATIONS.select(
                "allergies, dietaryRestrictions"
            ).throwOnError();

        if (!allRegistrations) {
            return res.status(StatusCodes.OK).json({
                none: 0,
                dietaryRestrictions: 0,
                allergies: 0,
                both: 0,
                allergyCounts: {},
                dietaryRestrictionCounts: {},
            });
        }

        const hasAllergies = (reg: { allergies: string[] }) =>
            reg.allergies && reg.allergies.length > 0;
        const hasDietaryRestrictions = (reg: {
            dietaryRestrictions: string[];
        }) => reg.dietaryRestrictions && reg.dietaryRestrictions.length > 0;

        const noneCount = allRegistrations.filter(
            (reg) => !hasAllergies(reg) && !hasDietaryRestrictions(reg)
        ).length;

        const dietaryOnlyCount = allRegistrations.filter(
            (reg) => !hasAllergies(reg) && hasDietaryRestrictions(reg)
        ).length;

        const allergiesOnlyCount = allRegistrations.filter(
            (reg) => hasAllergies(reg) && !hasDietaryRestrictions(reg)
        ).length;

        const bothCount = allRegistrations.filter(
            (reg) => hasAllergies(reg) && hasDietaryRestrictions(reg)
        ).length;

        const allergyCounts: Record<string, number> = allRegistrations
            .filter(hasAllergies)
            .flatMap((reg) => reg.allergies)
            .reduce(
                (acc, allergy) => {
                    acc[allergy] = (acc[allergy] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            );

        const dietaryRestrictionCounts: Record<string, number> =
            allRegistrations
                .filter(hasDietaryRestrictions)
                .flatMap((reg) => reg.dietaryRestrictions)
                .reduce(
                    (acc, restriction) => {
                        acc[restriction] = (acc[restriction] || 0) + 1;
                        return acc;
                    },
                    {} as Record<string, number>
                );

        return res.status(StatusCodes.OK).json({
            none: noneCount,
            dietaryRestrictions: dietaryOnlyCount,
            allergies: allergiesOnlyCount,
            both: bothCount,
            allergyCounts,
            dietaryRestrictionCounts,
        });
    }
);

// get the number of registrations
statsRouter.get(
    "/registrations",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const { count } = await SupabaseDB.REGISTRATIONS.select("*", {
            count: "exact",
            head: true,
        }).throwOnError();

        return res.status(StatusCodes.OK).json({ count: count || 0 });
    }
);

// event attendance at a specific event
statsRouter.get(
    "/event/:EVENT_ID/attendance",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const schema = z.object({
            EVENT_ID: z.string().uuid(),
        });

        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: result.error.errors[0].message,
            });
        }
        const eventId = result.data.EVENT_ID;

        const { data: event } = await SupabaseDB.EVENTS.select(
            "attendanceCount"
        )
            .eq("eventId", eventId)
            .maybeSingle()
            .throwOnError();

        if (!event) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "Event not found" });
        }

        return res
            .status(StatusCodes.OK)
            .json({ attendanceCount: event.attendanceCount });
    }
);

// Number of people at each tier
statsRouter.get(
    "/tier-counts",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const { data } = await SupabaseDB.ATTENDEES.select("currentTier", {
            count: "exact",
        }).throwOnError();

        // Aggregate counts for each tier
        const tierCounts: Record<TierType, number> = {
            TIER1: 0,
            TIER2: 0,
            TIER3: 0,
            TIER4: 0,
        };
        data?.forEach((attendee: { currentTier: TierType }) => {
            if (attendee.currentTier) {
                tierCounts[attendee.currentTier] =
                    (tierCounts[attendee.currentTier] || 0) + 1;
            }
        });

        return res.status(StatusCodes.OK).json(tierCounts);
    }
);

// Number of people who marked each tag
statsRouter.get(
    "/tag-counts",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const { data } =
            await SupabaseDB.ATTENDEES.select("tags").throwOnError();

        // Aggregate counts for each tag
        const tagCounts: Record<string, number> = {};
        data?.forEach((attendee: { tags: string[] }) => {
            attendee.tags?.forEach((tag: string) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        return res.status(StatusCodes.OK).json(tagCounts);
    }
);

// Number of people who redeemed each merch item
statsRouter.get(
    "/merch-redemption-counts",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const { data } =
            await SupabaseDB.REDEMPTIONS.select("item").throwOnError();
        // Aggregate counts for each merch item
        const itemCounts: Record<TierType, number> = {
            TIER1: 0,
            TIER2: 0,
            TIER3: 0,
            TIER4: 0,
        };
        data?.forEach((redemption: { item: TierType }) => {
            if (redemption.item) {
                itemCounts[redemption.item] =
                    (itemCounts[redemption.item] || 0) + 1;
            }
        });

        return res.status(StatusCodes.OK).json(itemCounts);
    }
);

// Take in parameter n, return the number of attendees who attended at least n events
statsRouter.get(
    "/attended-at-least/:N",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const schema = z.object({
            N: z.coerce
                .number()
                .int()
                .gte(0, { message: "N must be greater equal than 0" }),
        });

        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                error: result.error.errors[0].message,
            });
        }
        const n = result.data.N;

        const { data: attendanceRecords } =
            await SupabaseDB.ATTENDEE_ATTENDANCES.select(
                "eventsAttended"
            ).throwOnError();

        const countAtLeastN =
            attendanceRecords?.filter(
                (record: { eventsAttended: string[] }) =>
                    record.eventsAttended.length >= n
            ).length ?? 0;

        return res.status(StatusCodes.OK).json({ count: countAtLeastN });
    }
);

export default statsRouter;
