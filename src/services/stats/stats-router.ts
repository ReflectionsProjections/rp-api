import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { supabase, SupabaseDB, TierType } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { getCurrentDay } from "../checkin/checkin-utils";
import { z } from "zod";
import "./stats-schema"; // registers OpenAPI schemas

const statsRouter = Router();

/**
 * @swagger
 * /stats/check-in:
 *   get:
 *     summary: Get unique check-in count
 *     description: |
 *       Returns the number of unique attendees who have checked in to any
 *       CHECKIN-type event.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Number of unique check-ins
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsCountResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/merch-item/{PRICE}:
 *   get:
 *     summary: Get count of attendees eligible for a merch item
 *     description: |
 *       Returns the number of attendees who have accumulated at least PRICE points
 *       and are therefore eligible to redeem the corresponding merch item.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     parameters:
 *       - name: PRICE
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Number of eligible attendees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsCountResponse'
 *       400:
 *         description: PRICE is negative
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "PRICE must be non-negative"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/priority-attendee:
 *   get:
 *     summary: Get count of priority attendees for today
 *     description: |
 *       Returns the number of attendees who have priority access on the
 *       current day of the week.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Number of priority attendees for today
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsCountResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/attendance/{N}:
 *   get:
 *     summary: Get attendance counts for the past N events
 *     description: |
 *       Returns the `attendanceCount` for the N most recently ended events,
 *       ordered newest-first.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     parameters:
 *       - name: N
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Attendance counts for the past N events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsAttendanceCountsResponse'
 *       400:
 *         description: N is not a positive integer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "N must be greater than 0"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/dietary-restrictions:
 *   get:
 *     summary: Get dietary restriction breakdown
 *     description: |
 *       Returns counts of registrations grouped by whether they have allergies,
 *       dietary restrictions, both, or neither, plus per-item breakdowns.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Dietary restriction and allergy breakdown
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsDietaryRestrictionsResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/registrations:
 *   get:
 *     summary: Get total registration count
 *     description: |
 *       Returns the total number of submitted registrations.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Total registration count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsCountResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/event/{EVENT_ID}/attendance:
 *   get:
 *     summary: Get attendance count for a specific event
 *     description: |
 *       Returns the `attendanceCount` recorded for the given event.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     parameters:
 *       - name: EVENT_ID
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attendance count for the event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsEventAttendanceResponse'
 *       400:
 *         description: EVENT_ID is not a valid UUID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "Invalid uuid"
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "Event not found"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/tier-counts:
 *   get:
 *     summary: Get attendee count per tier
 *     description: |
 *       Returns the number of attendees currently at each tier level.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Attendee counts broken down by tier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsTierCountsResponse'
 *     security:
 *       - bearerAuth: []
 */
// Number of people at each tier
statsRouter.get(
    "/tier-counts",
    RoleChecker([Role.enum.STAFF], false),
    async (req, res) => {
        const { data } = await supabase.rpc("get_tier_counts").throwOnError();

        const tierCounts: Record<TierType, number> = {
            TIER1: 0,
            TIER2: 0,
            TIER3: 0,
            TIER4: 0,
        };

        data?.forEach((row: { currentTier: TierType; count: number }) => {
            if (row.currentTier && typeof row.count === "number") {
                tierCounts[row.currentTier] = row.count;
            }
        });

        return res.status(StatusCodes.OK).json(tierCounts);
    }
);

/**
 * @swagger
 * /stats/tag-counts:
 *   get:
 *     summary: Get attendee count per interest tag
 *     description: |
 *       Returns a map of each interest tag to the number of attendees who
 *       selected it during registration.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Tag selection counts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsTagCountsResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/merch-redemption-counts:
 *   get:
 *     summary: Get merch redemption counts per tier
 *     description: |
 *       Returns the number of times each tier's merch item has been redeemed.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Merch redemption counts broken down by tier item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsTierCountsResponse'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /stats/attended-at-least/{N}:
 *   get:
 *     summary: Get count of attendees who attended at least N events
 *     description: |
 *       Returns the number of attendees whose `eventsAttended` list has at
 *       least N entries.
 *
 *       **Required roles: STAFF**
 *     tags: [Stats]
 *     parameters:
 *       - name: N
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Number of qualifying attendees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsCountResponse'
 *       400:
 *         description: N is negative
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "N must be greater equal than 0"
 *     security:
 *       - bearerAuth: []
 */
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
