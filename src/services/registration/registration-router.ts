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
import { registrationExists, generateEncryptedId } from "./registration-utils";
import cors from "cors";
import Config from "../../config";

const registrationRouter = Router();
registrationRouter.use(cors());

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

        const encryptedId = await generateEncryptedId(payload.userId);
        const redirect = Config.API_RESUME_UPDATE_ROUTE + `${encryptedId}`;
        console.log(redirect)

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

registrationRouter.post(
    "/filter",
    RoleChecker([Role.Enum.STAFF, Role.Enum.CORPORATE], true),
    async (req, res, next) => {
        try {
            const { graduations, majors, jobInterests } =
                RegistrationFilterValidator.parse(req.body);

            const query = {
                hasSubmitted: true,
                hasResume: true,
                ...(graduations && { graduation: { $in: graduations } }),
                ...(majors && { major: { $in: majors } }),
                ...(jobInterests && {
                    jobInterest: { $elemMatch: { $in: jobInterests } },
                }),
            };

            const projection = {
                userId: 1,
                name: 1,
                major: 1,
                graduation: 1,
                jobInterest: 1,
                portfolios: 1,
            };

            const registrants = await Database.REGISTRATION.find(
                query,
                projection
            );

            return res.status(StatusCodes.OK).json({ registrants });
        } catch (error) {
            next(error);
        }
    }
);

export default registrationRouter;
