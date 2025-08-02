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
        };

        const { data: newEvent } = await SupabaseDB.EVENTS.insert(dbData)
            .select("*")
            .single()
            .throwOnError();

        const responseEvent = internalEventView.parse(newEvent);

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
