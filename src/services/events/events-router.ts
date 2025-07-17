/* eslint no-var: 0 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    externalEventView,
    internalEventView,
    eventInfoValidator,
} from "./events-schema";
import { SupabaseDB } from "../../supabase";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { isAdmin, isStaff } from "../auth/auth-utils";

const eventsRouter = Router();

eventsRouter.get("/currentOrNext", RoleChecker([], true), async (req, res) => {
    const currentTime = new Date();
    const payload = res.locals.payload;

    const isUser = !(isStaff(payload) || isAdmin(payload));

    let query = SupabaseDB.EVENTS.select("*")
        .gte("start_time", currentTime.toISOString())
        .order("start_time", { ascending: true })
        .limit(1);

    if (isUser) {
        query = query.eq("is_visible", true);
    }

    const { data: events } = await query.throwOnError();

    if (events && events.length > 0) {
        const event = events[0];

        const transformedEvent = {
            eventId: event.event_id,
            name: event.name,
            startTime: event.start_time,
            endTime: event.end_time,
            points: event.points,
            description: event.description,
            isVirtual: event.is_virtual,
            imageUrl: event.image_url,
            location: event.location,
            isVisible: event.is_visible,
            attendanceCount: event.attendance_count,
            eventType: event.event_type,
        };

        return res.status(StatusCodes.OK).json(transformedEvent);
    } else {
        return res
            .status(StatusCodes.NO_CONTENT)
            .json({ error: "DoesNotExist" });
    }
});

eventsRouter.get("/", RoleChecker([], true), async (req, res) => {
    const payload = res.locals.payload;

    const isStaffOrAdmin = isStaff(payload) || isAdmin(payload);

    let query = SupabaseDB.EVENTS.select("*")
        .order("start_time", { ascending: true })
        .order("end_time", { ascending: false });

    if (!isStaffOrAdmin) {
        query = query.eq("is_visible", true);
    }

    const { data: events } = await query.throwOnError();

    const transformedEvents = events.map((event) => ({
        eventId: event.event_id,
        name: event.name,
        startTime: event.start_time,
        endTime: event.end_time,
        points: event.points,
        description: event.description,
        isVirtual: event.is_virtual,
        imageUrl: event.image_url,
        location: event.location,
        isVisible: event.is_visible,
        attendanceCount: event.attendance_count,
        eventType: event.event_type,
    }));

    const filterFunction = isStaffOrAdmin
        ? (x: any) => internalEventView.parse(x)
        : (x: any) => externalEventView.parse(x);

    const filtered_events = transformedEvents.map(filterFunction);
    return res.status(StatusCodes.OK).json(filtered_events);
});

eventsRouter.get("/:EVENTID", RoleChecker([], true), async (req, res) => {
    const eventId = req.params.EVENTID;
    const payload = res.locals.payload;

    const isStaffOrAdmin = isStaff(payload) || isAdmin(payload);

    const { data: event } = await SupabaseDB.EVENTS.select("*")
        .eq("event_id", eventId)
        .maybeSingle()
        .throwOnError();

    if (!event) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ error: "DoesNotExist" });
    }

    const transformedEvent = {
        eventId: event.event_id,
        name: event.name,
        startTime: event.start_time,
        endTime: event.end_time,
        points: event.points,
        description: event.description,
        isVirtual: event.is_virtual,
        imageUrl: event.image_url,
        location: event.location,
        isVisible: event.is_visible,
        attendanceCount: event.attendance_count,
        eventType: event.event_type,
    };

    if (!isStaffOrAdmin && !transformedEvent.isVisible) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ error: "DoesNotExist" });
    }

    const filterFunction = isStaffOrAdmin
        ? internalEventView.parse
        : externalEventView.parse;

    const validatedData = filterFunction(transformedEvent);
    return res.status(StatusCodes.OK).json(validatedData);
});

eventsRouter.post(
    "/",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const validatedData = eventInfoValidator.parse(req.body);

        const dbData = {
            name: validatedData.name,
            start_time: validatedData.startTime.toISOString(),
            end_time: validatedData.endTime.toISOString(),
            points: validatedData.points,
            description: validatedData.description,
            is_virtual: validatedData.isVirtual,
            image_url: validatedData.imageUrl,
            location: validatedData.location,
            is_visible: validatedData.isVisible,
            attendance_count: validatedData.attendanceCount,
            event_type: validatedData.eventType,
        };

        const { data: newEvent } = await SupabaseDB.EVENTS.insert(dbData)
            .select("*")
            .single()
            .throwOnError();

        const responseEvent = internalEventView.parse({
            eventId: newEvent.event_id,
            name: newEvent.name,
            startTime: newEvent.start_time,
            endTime: newEvent.end_time,
            points: newEvent.points,
            description: newEvent.description,
            isVirtual: newEvent.is_virtual,
            imageUrl: newEvent.image_url,
            location: newEvent.location,
            isVisible: newEvent.is_visible,
            attendanceCount: newEvent.attendance_count,
            eventType: newEvent.event_type,
        });

        return res.status(StatusCodes.CREATED).json(responseEvent);
    }
);

eventsRouter.put(
    "/:EVENTID",
    RoleChecker([Role.Enum.STAFF, Role.Enum.ADMIN]),
    async (req, res) => {
        const eventId = req.params.EVENTID;
        eventInfoValidator.parse(req.body);
        const validatedData = internalEventView.parse(req.body);

        const dbData = {
            name: validatedData.name,
            start_time: validatedData.startTime.toISOString(),
            end_time: validatedData.endTime.toISOString(),
            points: validatedData.points,
            description: validatedData.description,
            is_virtual: validatedData.isVirtual,
            image_url: validatedData.imageUrl,
            location: validatedData.location,
            is_visible: validatedData.isVisible,
            attendance_count: validatedData.attendanceCount,
            event_type: validatedData.eventType,
        };

        const { data: updatedEvent } = await SupabaseDB.EVENTS.update(dbData)
            .eq("event_id", eventId)
            .select("*")
            .maybeSingle()
            .throwOnError();

        if (!updatedEvent) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        const responseEvent = internalEventView.parse({
            eventId: updatedEvent.event_id,
            name: updatedEvent.name,
            startTime: updatedEvent.start_time,
            endTime: updatedEvent.end_time,
            points: updatedEvent.points,
            description: updatedEvent.description,
            isVirtual: updatedEvent.is_virtual,
            imageUrl: updatedEvent.image_url,
            location: updatedEvent.location,
            isVisible: updatedEvent.is_visible,
            attendanceCount: updatedEvent.attendance_count,
            eventType: updatedEvent.event_type,
        });

        return res.status(StatusCodes.OK).json(responseEvent);
    }
);

eventsRouter.delete(
    "/:EVENTID",
    RoleChecker([Role.Enum.ADMIN]),
    async (req, res) => {
        const eventId = req.params.EVENTID;

        const { data: deletedEvent } = await SupabaseDB.EVENTS.delete()
            .eq("event_id", eventId)
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
