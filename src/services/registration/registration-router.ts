import cors from "cors";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import Config from "../../config";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { AttendeeCreateValidator } from "../attendee/attendee-validators";
import { Role } from "../auth/auth-models";
import { RegistrationValidator } from "./registration-schema";
import { generateEncryptedId, registrationExists } from "./registration-utils";

import Mustache from "mustache";
import { sendHTMLEmail } from "../ses/ses-utils";

import templates from "../../templates/templates";

const registrationRouter = Router();
registrationRouter.use(cors());

// A database upsert operation to save registration mid-progress
registrationRouter.post("/save", RoleChecker([]), async (req, res) => {
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
});

registrationRouter.post("/submit", RoleChecker([]), async (req, res) => {
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

    const substitution = {
        magic_link: redirect,
        name: registrationData.name || "N/A",
        email: registrationData.email || "N/A",
        university: registrationData.university || "N/A",
        major: registrationData.major || "N/A",
        degree: registrationData.degree || "N/A",
        graduation: registrationData.graduation || "N/A",
        dietaryRestrictions:
            registrationData.dietaryRestrictions.length > 0
                ? registrationData.dietaryRestrictions
                : "N/A",
        allergies:
            registrationData.allergies.length > 0
                ? registrationData.allergies
                : "N/A",
        gender: registrationData.gender || "N/A",
        ethnicity: registrationData.ethnicity || "N/A",
        portfolios:
            registrationData.portfolios.length > 0
                ? registrationData.portfolios
                : "N/A",
        jobInterest:
            (registrationData?.jobInterest ?? []).length > 0
                ? registrationData.jobInterest
                : "N/A",
    };

    await sendHTMLEmail(
        payload.email,
        "Reflections Projections 2024 Confirmation!",
        Mustache.render(templates.REGISTRATION_CONFIRMATION, substitution)
    );

    return res.status(StatusCodes.OK).json(registrationData);
});

// Retrieve registration fields both to repopulate registration info for a user
registrationRouter.get("/", RoleChecker([]), async (req, res) => {
    const registration = await Database.REGISTRATION.findOne({
        userId: res.locals.payload.userId,
    });

    if (!registration) {
        return res.status(StatusCodes.NOT_FOUND).json({
            error: "DoesNotExist",
        });
    }

    return res.status(StatusCodes.OK).json({ registration });
});

registrationRouter.get(
    "/all",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.CORPORATE]),
    async (req, res) => {
        const query = {
            hasSubmitted: true,
            hasResume: true,
        };

        const projection = {
            userId: 1,
            name: 1,
            major: 1,
            graduation: 1,
            degree: 1,
            jobInterest: 1,
            portfolios: 1,
        };

        const registrants = await Database.REGISTRATION.find(query, projection);

        return res.status(StatusCodes.OK).json({ registrants });
    }
);

export default registrationRouter;
