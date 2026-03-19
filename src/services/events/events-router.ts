/* eslint no-var: 0 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    externalEventView,
    internalEventView,
    eventInfoValidator,
} from "./events-schema";
import { SupabaseDB } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { isAdmin, isStaff } from "../auth/auth-utils";

const eventsRouter = Router();

/**
 * @swagger
 * /events/currentOrNext/:
 *   get:
 *     summary: Get next event
 *     description: |
 *       The events checked are filtered based on what the current user can access.
 *       If the user is not Staff or Admin, non-visible events are skipped and
 *       it will return an externalEventView instead of an internalEventView.
 *
 *       **Required roles: none**
 *
 *       **Optional roles: STAFF | ADMIN**
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: The next event
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/InternalEventView'
 *                 - $ref: '#/components/schemas/ExternalEventView'
 *       204:
 *         description: No upcoming events exist
 *     security: []
 */
eventsRouter.get("/currentOrNext", RoleChecker([], true), async (req, res) => {
    const currentTime = new Date();
    const payload = res.locals.payload;

    const isUser = !(isStaff(payload) || isAdmin(payload));

    let query = SupabaseDB.EVENTS.select("*")
        .gte("startTime", currentTime.toISOString())
        .order("startTime", { ascending: true })
        .limit(1);

    if (isUser) {
        query = query.eq("isVisible", true);
    }

    const { data: events } = await query.throwOnError();

    if (events && events.length > 0) {
        const event = events[0];
        return res.status(StatusCodes.OK).json(event);
    } else {
        return res
            .status(StatusCodes.NO_CONTENT)
            .json({ error: "DoesNotExist" });
    }
});

/**
 * @swagger
 * /events/:
 *   get:
 *     summary: Get all events
 *     description: |
 *       The events returned are filtered based on what the current user can access.
 *       If the user is not Staff or Admin, only visible events will be shown and
 *       it will return externalEventViews instead of internalEventViews.
 *
 *       **Required roles: none**
 *
 *       **Optional roles: STAFF | ADMIN**
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: A list of all events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/InternalEventView'
 *                   - $ref: '#/components/schemas/ExternalEventView'
 *     security: []
 */
eventsRouter.get("/", RoleChecker([], true), async (req, res) => {
    const payload = res.locals.payload;

    const isStaffOrAdmin = isStaff(payload) || isAdmin(payload);

    let query = SupabaseDB.EVENTS.select("*")
        .order("startTime", { ascending: true })
        .order("endTime", { ascending: false });

    if (!isStaffOrAdmin) {
        query = query.eq("isVisible", true);
    }

    const { data: events } = await query.throwOnError();

    const filterFunction = isStaffOrAdmin
        ? (x: any) => internalEventView.parse(x)
        : (x: any) => externalEventView.parse(x);

    const filtered_events = events.map(filterFunction);
    return res.status(StatusCodes.OK).json(filtered_events);
});

/**
 * @swagger
 * /events/{EVENTID}:
 *   get:
 *     summary: Get event by id
 *     description: |
 *       If the user is not Staff or Admin, only visible events can be accessed and
 *       it will return an externalEventView instead of an internalEventView.
 *
 *       **Required roles: none**
 *
 *       **Optional roles: STAFF | ADMIN**
 *     tags: [Events]
 *     parameters:
 *       - name: EVENTID
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The event requested
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/InternalEventView'
 *                 - $ref: '#/components/schemas/ExternalEventView'
 *       404:
 *         description: Couldn't find the requested event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "EventNotFound"
 *     security: []
 */
eventsRouter.get("/:EVENTID", RoleChecker([], true), async (req, res) => {
    const eventId = req.params.EVENTID;
    const payload = res.locals.payload;

    const isStaffOrAdmin = isStaff(payload) || isAdmin(payload);

    const { data: event } = await SupabaseDB.EVENTS.select("*")
        .eq("eventId", eventId)
        .maybeSingle()
        .throwOnError();

    if (!event) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ error: "DoesNotExist" });
    }

    if (!isStaffOrAdmin && !event.isVisible) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ error: "DoesNotExist" });
    }

    const filterFunction = isStaffOrAdmin
        ? internalEventView.parse
        : externalEventView.parse;

    const validatedData = filterFunction(event);
    return res.status(StatusCodes.OK).json(validatedData);
});

/**
 * @swagger
 * /events/:
 *   post:
 *     summary: Create an event
 *     description: |
 *       Creates a new event and adds it to the database
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventInfoValidator'
 *     responses:
 *       201:
 *         description: The new event (added to the database)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalEventView'
 *     security:
 *       - STAFF: []
 *       - ADMIN: []
 */
eventsRouter.post(
    "/",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const validatedData = eventInfoValidator.parse(req.body);

        const dbData = {
            name: validatedData.name,
            startTime: validatedData.startTime.toISOString(),
            endTime: validatedData.endTime.toISOString(),
            points: validatedData.points,
            description: validatedData.description,
            isVirtual: validatedData.isVirtual,
            imageUrl: validatedData.imageUrl,
            location: validatedData.location,
            isVisible: validatedData.isVisible,
            attendanceCount: validatedData.attendanceCount,
            eventType: validatedData.eventType,
            tags: validatedData.tags,
        };

        const { data: newEvent } = await SupabaseDB.EVENTS.insert(dbData)
            .select("*")
            .single()
            .throwOnError();

        const responseEvent = internalEventView.parse(newEvent);

        return res.status(StatusCodes.CREATED).json(responseEvent);
    }
);

/**
 * @swagger
 * /events/{EVENTID}:
 *   put:
 *     summary: Update an event
 *     description: |
 *       Updates the data for a preexisting event
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Events]
 *     parameters:
 *       - name: EVENTID
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventInfoValidator'
 *     responses:
 *       200:
 *         description: The updated event data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalEventView'
 *       404:
 *         description: Couldn't find the requested event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "EventNotFound"
 *     security:
 *       - STAFF: []
 *       - ADMIN: []
 */
eventsRouter.put(
    "/:EVENTID",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const eventId = req.params.EVENTID;
        eventInfoValidator.parse(req.body);
        const validatedData = internalEventView.parse(req.body);

        const dbData = {
            name: validatedData.name,
            startTime: validatedData.startTime.toISOString(),
            endTime: validatedData.endTime.toISOString(),
            points: validatedData.points,
            description: validatedData.description,
            isVirtual: validatedData.isVirtual,
            imageUrl: validatedData.imageUrl,
            location: validatedData.location,
            isVisible: validatedData.isVisible,
            attendanceCount: validatedData.attendanceCount,
            eventType: validatedData.eventType,
            tags: validatedData.tags,
        };

        const { data: updatedEvent } = await SupabaseDB.EVENTS.update(dbData)
            .eq("eventId", eventId)
            .select("*")
            .maybeSingle()
            .throwOnError();

        if (!updatedEvent) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        const responseEvent = internalEventView.parse(updatedEvent);

        return res.status(StatusCodes.OK).json(responseEvent);
    }
);

/**
 * @swagger
 * /events/{EVENTID}:
 *   delete:
 *     summary: Delete an event
 *     description: |
 *       Deletes an event entry from the database
 *
 *       **Required roles: ADMIN**
 *     tags: [Events]
 *     parameters:
 *       - name: EVENTID
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: The event was successfully deleted
 *       404:
 *         description: Couldn't find the requested event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "EventNotFound"
 *     security:
 *       - ADMIN: []
 */
eventsRouter.delete(
    "/:EVENTID",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const eventId = req.params.EVENTID;

        const { data: deletedEvent } = await SupabaseDB.EVENTS.delete()
            .eq("eventId", eventId)
            .select("*")
            .throwOnError();

        if (!deletedEvent || deletedEvent.length === 0) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        return res.sendStatus(StatusCodes.NO_CONTENT);
    }
);

export default eventsRouter;
