import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    RegistrationFilterValidator,
    RegistrationValidator,
} from "./registration-schema";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { AttendeeCreateValidator } from "../attendee/attendee-validators";
import { registrationExists } from "./registration-utils";

const registrationRouter = Router();

// A database upsert operation to save registration mid-progress
registrationRouter.post("/save", RoleChecker([]), async (req, res, next) => {
    try {
        const payload = res.locals.payload;
        const existingRegistration = await registrationExists(payload.userId);

        if (existingRegistration) {
            return res.status(StatusCodes.CONFLICT).json({
                error: "AlreadySubmitted",
            });
        }

        const registrationData = RegistrationValidator.parse({
            ...req.body,
            userId: payload.userId,
        });

        await Database.REGISTRATION.findOneAndUpdate(
            { userId: res.locals.payload.userId },
            {
                ...registrationData,
                hasSubmitted: false,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(StatusCodes.OK).json(registrationData);
    } catch (error) {
        next(error);
    }
});

registrationRouter.post("/submit", RoleChecker([]), async (req, res, next) => {
    try {
        const payload = res.locals.payload;
        const existingRegistration = await registrationExists(payload.userId);

        if (existingRegistration) {
            return res.status(StatusCodes.CONFLICT).json({
                error: "AlreadySubmitted",
            });
        }

        const registrationData = RegistrationValidator.parse({
            ...req.body,
            userId: payload.userId,
        });

        await Database.REGISTRATION.findOneAndUpdate(
            { userId: payload.userId },
            {
                ...registrationData,
                hasSubmitted: true,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await Database.ROLES.findOneAndUpdate(
            { userId: payload.userId },
            {
                $addToSet: {
                    roles: Role.Values.USER,
                },
            },
            { upsert: true }
        );

        const attendeeData = AttendeeCreateValidator.parse(registrationData);

        await Database.ATTENDEE.findOneAndUpdate(
            { userId: payload.userId },
            attendeeData,
            { upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(StatusCodes.OK).json(registrationData);
    } catch (error) {
        next(error);
    }
});

// Retrieve registration fields both to repopulate registration info for a user
registrationRouter.get("/", RoleChecker([]), async (req, res, next) => {
    try {
        const registration = await Database.REGISTRATION.findOne({
            userId: res.locals.payload.userId,
        });

        if (!registration) {
            return { error: "DoesNotExist" };
        }

        return res.status(StatusCodes.OK).json({ registration });
    } catch (error) {
        next(error);
    }
});

// Get attendees based on a partial filter in body
registrationRouter.post(
    "/filter",
    RoleChecker([Role.Enum.STAFF, Role.Enum.CORPORATE]),
    async (req, res, next) => {
        try {
            const filterData = RegistrationFilterValidator.parse(req.body);
            const projection = Object.assign({}, ...filterData.projection);
            const attendees = await Database.REGISTRATION.find(
                filterData.filter,
                { ...projection, hasSubmitted: 1 }
            );
            return res.status(StatusCodes.OK).json(attendees);
        } catch (error) {
            next(error);
        }
    }
);

export default registrationRouter;
