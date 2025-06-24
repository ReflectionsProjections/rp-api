import cors from "cors";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import {
    RegistrationDraftValidator,
    RegistrationValidator,
} from "./registration-schema";

import Mustache from "mustache";
import { sendHTMLEmail } from "../ses/ses-utils";

import templates from "../../templates/templates";

const registrationRouter = Router();
registrationRouter.use(cors());

registrationRouter.post("/drafts", RoleChecker([]), async (req, res) => {
    const { userId } = res.locals.payload;

    const result = RegistrationDraftValidator.safeParse(req.body);
    if (!result.success) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: result.error.format() });
    }

    const data = result.data;

    const existing = await Database.DRAFT_REGISTRATION.findOne({ userId });
    if (existing) {
        existing.set({ ...data, lastUpdated: new Date() });
        await existing.save();
        return res.status(StatusCodes.OK).json({ message: "Draft updated" });
    }

    await Database.DRAFT_REGISTRATION.create({ ...data, userId });
    return res.status(StatusCodes.CREATED).json({ message: "Draft created" });
});

registrationRouter.get("/drafts", RoleChecker([]), async (req, res) => {
    const { userId } = res.locals.payload;

    const draft = await Database.DRAFT_REGISTRATION.findOne({ userId });
    if (!draft) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: "NotFound" });
    }

    return res.status(StatusCodes.OK).json(draft);
});

registrationRouter.post("/submit", RoleChecker([]), async (req, res) => {
    const { userId, displayName, email } = res.locals.payload;

    const result = RegistrationValidator.safeParse(req.body);
    if (!result.success) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: result.error.format() });
    }

    const data = result.data;

    const existing = await Database.REGISTRATION.findOne({ userId });
    if (existing) {
        existing.set({ ...data, submittedAt: new Date() });
        await existing.save();
        return res
            .status(StatusCodes.OK)
            .json({ message: "Registration updated" });
    }

    await Promise.all([
        Database.REGISTRATION.create({ ...data, userId }),
        Database.ATTENDEE.findOneAndUpdate(
            { userId },
            {
                userId,
                name: displayName,
                email,
                dietaryRestrictions: result.data.dietaryRestrictions ?? [],
                allergies: result.data.allergies ?? [],
            },
            { upsert: true }
        ),
        Database.ROLES.findOneAndUpdate(
            { userId },
            { $addToSet: { roles: Role.Values.USER } },
            { upsert: true }
        ),
    ]);

    const substitution = {
        name: data.name,
        school: data.school,
        educationLevel: data.educationLevel,
        major: data.major,
        graduationYear: data.graduationYear,
        dietaryRestrictions:
            data.dietaryRestrictions && data.dietaryRestrictions.length > 0
                ? data.dietaryRestrictions.join(", ")
                : "N/A",
        allergies:
            data.allergies && data.allergies.length > 0
                ? data.allergies.join(", ")
                : "N/A",
        gender: data.gender ?? "N/A",
        ethnicity: data.ethnicity ?? "N/A",
        personalLinks:
            data.personalLinks && data.personalLinks.length > 0
                ? data.personalLinks.join(", ")
                : "N/A",
        tags: data.tags && data.tags.length > 0 ? data.tags.join(", ") : "N/A",
        opportunities:
            data.opportunities && data.opportunities.length > 0
                ? data.opportunities.join(", ")
                : "N/A",
    };

    await sendHTMLEmail(
        email,
        "Reflections Projections 2025 Confirmation!",
        Mustache.render(templates.REGISTRATION_CONFIRMATION, substitution)
    );

    return res
        .status(StatusCodes.CREATED)
        .json({ message: "Registration submitted" });
});

registrationRouter.get(
    "/all",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.CORPORATE]),
    async (req, res) => {
        const registrants = await Database.REGISTRATION.find(
            { hasResume: true },
            {
                userId: 1,
                name: 1,
                major: 1,
                graduationYear: 1,
                educationLevel: 1,
                opportunities: 1,
                personalLinks: 1,
                _id: 0,
            }
        );

        return res.status(StatusCodes.OK).json({ registrants });
    }
);

export default registrationRouter;
