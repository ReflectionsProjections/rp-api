import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    RegistrationDraftValidator,
    RegistrationValidator,
} from "./registration-schema";
import { SupabaseDB } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { AttendeeCreateValidator } from "../attendee/attendee-validators";
import cors from "cors";
import Mustache from "mustache";
import { sendHTMLEmail } from "../ses/ses-utils";
import templates from "../../templates/templates";
import { Role } from "../auth/auth-models";

const registrationRouter = Router();
registrationRouter.use(cors());

/**
 * @swagger
 * /registration/draft:
 *   post:
 *     summary: Save a registration draft
 *     description: |
 *       Upserts an in-progress registration draft for the authenticated user.
 *       Allows partial form data to be saved before final submission.
 *
 *       **Required roles: (any authenticated user)**
 *     tags: [Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistrationDraftValidator'
 *     responses:
 *       200:
 *         description: The saved draft (with userId attached)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegistrationDraftValidator'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: {}
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /registration/draft:
 *   get:
 *     summary: Get the current user's registration draft
 *     description: |
 *       Returns the saved draft for the authenticated user, if one exists.
 *
 *       **Required roles: (any authenticated user)**
 *     tags: [Registration]
 *     responses:
 *       200:
 *         description: The user's saved draft
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegistrationDraftValidator'
 *       404:
 *         description: No draft found for this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "DoesNotExist"
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /registration/submit:
 *   post:
 *     summary: Submit a completed registration
 *     description: |
 *       Finalises the user's registration: upserts the registration record,
 *       assigns the USER role, creates/updates the attendee profile, subscribes
 *       the user to the attendees mailing list, and sends a confirmation email.
 *
 *       **Required roles: (any authenticated user)**
 *     tags: [Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistrationValidator'
 *     responses:
 *       200:
 *         description: The submitted registration (with userId attached)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegistrationValidator'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: {}
 *     security:
 *       - bearerAuth: []
 */
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
        SupabaseDB.REGISTRATIONS.upsert(registration, {
            onConflict: "userId",
        }).throwOnError(),
        SupabaseDB.AUTH_ROLES.upsert(
            {
                userId: payload.userId,
                role: Role.Enum.USER,
            },
            { onConflict: "userId,role", ignoreDuplicates: true }
        ).throwOnError(),
        SupabaseDB.ATTENDEES.upsert(attendee, {
            onConflict: "userId",
        }).throwOnError(),
        SupabaseDB.SUBSCRIPTIONS.upsert({
            userId: payload.userId,
            mailingList: "attendees",
        }).throwOnError(),
    ]);

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
        hasResume: registration.hasResume,
        school: registration.school,
        isInterestedMechMania: registration.isInterestedMechMania,
        isInterestedPuzzleBang: registration.isInterestedPuzzleBang,
        howDidYouHear:
            registration.howDidYouHear.length > 0
                ? registration.howDidYouHear.join(", ")
                : "N/A",
        opportunities:
            registration.opportunities.length > 0
                ? registration.opportunities.join(", ")
                : "N/A",
        personalLinks: registration.personalLinks,
        tags:
            registration.tags.length > 0 ? registration.tags.join(", ") : "N/A",
    };

    // NOTE: The school's email filters block emails with an exclamation mark (!) in the subject
    // Not sure why, but do not put exclamation marks in the subject line
    if (!existing) {
        await sendHTMLEmail(
            payload.email,
            "Reflections | Projections 2025 Registration Confirmation",
            Mustache.render(templates.REGISTRATION_CONFIRMATION, substitution)
        );
    } else {
        await sendHTMLEmail(
            payload.email,
            "Reflections | Projections 2025 Registration Updated",
            Mustache.render(
                templates.REGISTRATION_UPDATE_CONFIRMATION,
                substitution
            )
        );
    }

    return res.status(StatusCodes.OK).json(registration);
});

/**
 * @swagger
 * /registration/all:
 *   get:
 *     summary: Get all registrations with resumes
 *     description: |
 *       Returns a summary of all registrations where the attendee has indicated
 *       they have a resume. Used by corporate partners and admins for recruiting.
 *
 *       **Required roles: ADMIN | CORPORATE**
 *     tags: [Registration]
 *     responses:
 *       200:
 *         description: List of registration summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RegistrationSummaryView'
 *     security:
 *       - bearerAuth: []
 */
registrationRouter.get(
    "/all",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.CORPORATE]),
    async (req, res) => {
        const { data } = await SupabaseDB.REGISTRATIONS.select(
            "userId, name, majors, minors, school, educationLevel, graduationYear, opportunities, personalLinks"
        )
            .eq("hasResume", true)
            .throwOnError();

        return res.status(StatusCodes.OK).json(data);
    }
);

export default registrationRouter;
