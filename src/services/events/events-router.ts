/* eslint no-var: 0 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { publicEventValidator, privateEventValidator } from "./events-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { isAdmin, isStaff } from "../auth/auth-utils";

const eventsRouter = Router();

// Get current or next event based on current time
eventsRouter.get(
    "/currentOrNext",
    RoleChecker([], true),
    async (req, res, next) => {
        const currentTime = new Date();
        const payload = res.locals.payload;

        const isUser = !(isStaff(payload) || isAdmin(payload));

        try {
            const event = await Database.EVENTS.findOne({
                startTime: { $gte: currentTime },
                isVisible: isUser ? { $eq: true } : {},
            }).sort({ startTime: 1 });

            if (event) {
                return res.status(StatusCodes.OK).json(event);
            } else {
                return res
                    .status(StatusCodes.NO_CONTENT)
                    .json({ error: "DoesNotExist" });
            }
        } catch (error) {
            next(error);
        }
    }
);

// Get all events
eventsRouter.get("/", RoleChecker([], true), async (req, res, next) => {
    const payload = res.locals.payload;

    var filterFunction;

    try {
        var unfiltered_events = await Database.EVENTS.find();

        if (isStaff(payload) || isAdmin(payload)) {
            filterFunction = (x: any) => privateEventValidator.parse(x);
        } else {
            unfiltered_events = unfiltered_events.filter((x) => x.isVisible);
            filterFunction = (x: any) => publicEventValidator.parse(x);
        }

        const filtered_events = unfiltered_events.map(filterFunction);
        console.log(filtered_events);
        return res.status(StatusCodes.OK).json(filtered_events);
    } catch (error) {
        next(error);
    }
});

eventsRouter.get("/:EVENTID", RoleChecker([], true), async (req, res, next) => {
    // add RoleChecker here as well
    const eventId = req.params.EVENTID;
    const payload = res.locals.payload;

    var filterFunction;

    try {
        const event = await Database.EVENTS.findOne({ eventId: eventId });

        if (!event) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "DoesNotExist" });
        }

        if (isStaff(payload) || isAdmin(payload)) {
            filterFunction = privateEventValidator.parse;
        } else {
            filterFunction = publicEventValidator.parse;
            if (!event.isVisible) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "DoesNotExist" });
            }
        }

        const validatedData = filterFunction(event.toObject());
        return res.status(StatusCodes.OK).json(validatedData);
    } catch (error) {
        next(error);
    }
});

eventsRouter.post(
    "/",
    RoleChecker([Role.Enum.STAFF]),
    async (req, res, next) => {
        try {
            const validatedData = privateEventValidator.parse(req.body);
            const event = new Database.EVENTS(validatedData);
            await event.save();
            return res.sendStatus(StatusCodes.CREATED);
        } catch (error) {
            next(error);
        }
    }
);

eventsRouter.put(
    "/:EVENTID",
    RoleChecker([Role.Enum.STAFF], true),
    async (req, res, next) => {
        const eventId = req.params.EVENTID;
        try {
            const validatedData = privateEventValidator.parse(req.body);
            const event = await Database.EVENTS.findOneAndUpdate(
                { eventId: eventId },
                { $set: validatedData }
            );

            if (!event) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ error: "DoesNotExist" });
            }

            return res.sendStatus(StatusCodes.OK);
        } catch (error) {
            next(error);
        }
    }
);

// Delete event
eventsRouter.delete(
    "/:EVENTID",
    RoleChecker([Role.Enum.STAFF], true),
    async (req, res, next) => {
        const eventId = req.params.EVENTID;
        try {
            await Database.EVENTS.findOneAndDelete({ eventId: eventId });

            return res.sendStatus(StatusCodes.NO_CONTENT);
        } catch (error) {
            next(error);
        }
    }
);

export default eventsRouter;
