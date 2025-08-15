import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    RegistrationDraftValidator,
    RegistrationValidator,
} from "./registration-schema";
import { SupabaseDB } from "../../supabase";
import RoleChecker from "../../middleware/role-checker";
import { AttendeeCreateValidator } from "../attendee/attendee-validators";
import cors from "cors";
import Mustache from "mustache";
import { sendHTMLEmail } from "../ses/ses-utils";
import templates from "../../templates/templates";
import { Role } from "../auth/auth-models";

const registrationRouter = Router();
registrationRouter.use(cors());

registrationRouter.post("/draft", RoleChecker([]), async (req, res) => {
    const payload = res.locals.payload;

    const validatorResult = RegistrationDraftValidator.safeParse(req.body);
    if (!validatorResult.success) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: validatorResult.error.format() });
    }

    const registrationDraft = {
        ...validatorResult.data,
        userId: payload.userId,
    };

    await SupabaseDB.DRAFT_REGISTRATIONS.upsert(
        registrationDraft
    ).throwOnError();

    return res.status(StatusCodes.OK).json(registrationDraft);
});

registrationRouter.get("/draft", RoleChecker([]), async (req, res) => {
    const { data: draftRegistration } =
        await SupabaseDB.DRAFT_REGISTRATIONS.select("*")
            .eq("userId", res.locals.payload.userId)
            .maybeSingle();

    if (!draftRegistration) {
        return res.status(StatusCodes.NOT_FOUND).json({
            error: "DoesNotExist",
        });
    }

    return res.status(StatusCodes.OK).json(draftRegistration);
});

registrationRouter.post("/submit", RoleChecker([]), async (req, res) => {
    const payload = res.locals.payload;

    const registrationResult = RegistrationValidator.safeParse(req.body);
    if (!registrationResult.success) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: registrationResult.error.format() });
    }

    const registration = { ...registrationResult.data, userId: payload.userId };

    const attendeeResult = AttendeeCreateValidator.safeParse(registration);
    if (!attendeeResult.success) {
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ error: attendeeResult.error.format() });
    }

    const attendee = attendeeResult.data;

    const { data: existing } = await SupabaseDB.REGISTRATIONS.select("userId")
        .eq("userId", payload.userId)
        .single();

    await Promise.all([
        SupabaseDB.REGISTRATIONS.upsert(registration).throwOnError(),
        SupabaseDB.AUTH_ROLES.upsert({
            userId: payload.userId,
            role: Role.Enum.USER,
        }).throwOnError(),
        SupabaseDB.ATTENDEES.upsert(attendee).throwOnError(),
    ]);

    if (!existing) {
        const substitution = {
            allergies:
                registration.allergies.length > 0
                    ? registration.allergies.join(", ")
                    : "N/A",
            dietaryRestrictions:
                registration.dietaryRestrictions.length > 0
                    ? registration.dietaryRestrictions.join(", ")
                    : "N/A",
            educationLevel: registration.educationLevel,
            ethnicity:
                registration.ethnicity.length > 0
                    ? registration.ethnicity.join(", ")
                    : "N/A",
            gender: registration.gender,
            graduationYear: registration.graduationYear,
            majors:
                registration.majors.length > 0
                    ? registration.majors.join(", ")
                    : "N/A",
            minors:
                registration.minors.length > 0
                    ? registration.minors.join(", ")
                    : "N/A",
            name: registration.name,
            hasResume: registration.resume !== undefined,
            school: registration.school,
            isInterestedMechMania: registration.isInterestedMechMania,
            isInterestedPuzzleBang: registration.isInterestedPuzzleBang,
            opportunities:
                registration.opportunities.length > 0
                    ? registration.opportunities.join(", ")
                    : "N/A",
            personalLinks: registration.personalLinks,
            tags:
                registration.tags.length > 0
                    ? registration.tags.join(", ")
                    : "N/A",
        };

        await sendHTMLEmail(
            payload.email,
            "Reflections Projections 2025 Confirmation!",
            Mustache.render(templates.REGISTRATION_CONFIRMATION, substitution)
        );
    }

    return res.status(StatusCodes.OK).json(registration);
});

registrationRouter.get(
    "/all",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.CORPORATE]),
    async (req, res) => {
        const { data } = await SupabaseDB.REGISTRATIONS.select(
            "userId, name, majors, minors, school, educationLevel, graduationYear, opportunities, personalLinks"
        ).throwOnError();

        return res.status(StatusCodes.OK).json(data);
    }
);

export default registrationRouter;
