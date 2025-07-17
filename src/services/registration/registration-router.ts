import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    RegistrationFilterValidator,
    RegistrationValidator,
} from "./registration-schema";
import { SupabaseDB } from "../../supabase";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { AttendeeCreateValidator } from "../attendee/attendee-validators";
import { registrationExists, generateEncryptedId } from "./registration-utils";
import cors from "cors";
import Config from "../../config";

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

    const dbRegistrationData = {
        user_id: registrationData.userId,
        name: registrationData.name,
        email: registrationData.email,
        university: registrationData.university,
        graduation: registrationData.graduation,
        major: registrationData.major,
        dietary_restrictions: registrationData.dietaryRestrictions,
        allergies: registrationData.allergies,
        gender: registrationData.gender,
        ethnicity: registrationData.ethnicity,
        hear_about_rp: registrationData.hearAboutRP,
        portfolios: registrationData.portfolios,
        job_interest: registrationData.jobInterest,
        is_interested_mech_mania: registrationData.isInterestedMechMania,
        is_interested_puzzle_bang: registrationData.isInterestedPuzzleBang,
        has_resume: registrationData.hasResume,
        degree: registrationData.degree,
        has_submitted: false,
    };

    await SupabaseDB.REGISTRATIONS.upsert(dbRegistrationData).throwOnError();

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

    const dbRegistrationData = {
        user_id: registrationData.userId,
        name: registrationData.name,
        email: registrationData.email,
        university: registrationData.university,
        graduation: registrationData.graduation,
        major: registrationData.major,
        dietary_restrictions: registrationData.dietaryRestrictions,
        allergies: registrationData.allergies,
        gender: registrationData.gender,
        ethnicity: registrationData.ethnicity,
        hear_about_rp: registrationData.hearAboutRP,
        portfolios: registrationData.portfolios,
        job_interest: registrationData.jobInterest,
        is_interested_mech_mania: registrationData.isInterestedMechMania,
        is_interested_puzzle_bang: registrationData.isInterestedPuzzleBang,
        has_resume: registrationData.hasResume,
        degree: registrationData.degree,
        has_submitted: true,
    };

    await SupabaseDB.REGISTRATIONS.upsert(dbRegistrationData).throwOnError();

    const { data: existingRoleRecord } = await SupabaseDB.ROLES.select("roles")
        .eq("user_id", payload.userId)
        .single();

    let updatedRoles: (
        | "USER"
        | "STAFF"
        | "ADMIN"
        | "CORPORATE"
        | "PUZZLEBANG"
    )[] = ["USER"]; // Default if no existing record
    if (existingRoleRecord && existingRoleRecord.roles) {
        const currentRoles = existingRoleRecord.roles as (
            | "USER"
            | "STAFF"
            | "ADMIN"
            | "CORPORATE"
            | "PUZZLEBANG"
        )[];
        updatedRoles = [...new Set([...currentRoles, "USER" as const])];
    }

    await SupabaseDB.ROLES.upsert({
        user_id: payload.userId,
        display_name: payload.displayName,
        email: payload.email,
        roles: updatedRoles,
    }).throwOnError();

    const attendeeData = AttendeeCreateValidator.parse(registrationData);

    const dbAttendeeData = {
        user_id: attendeeData.userId,
    };

    await SupabaseDB.ATTENDEES.upsert(dbAttendeeData).throwOnError();

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
    const { data: registration } = await SupabaseDB.REGISTRATIONS.select("*")
        .eq("user_id", res.locals.payload.userId)
        .maybeSingle();

    if (!registration) {
        return res.status(StatusCodes.NOT_FOUND).json({
            error: "DoesNotExist",
        });
    }

    const formattedRegistration = {
        userId: registration.user_id,
        name: registration.name,
        email: registration.email,
        university: registration.university,
        graduation: registration.graduation,
        major: registration.major,
        dietaryRestrictions: registration.dietary_restrictions,
        allergies: registration.allergies,
        gender: registration.gender,
        ethnicity: registration.ethnicity,
        hearAboutRP: registration.hear_about_rp,
        portfolios: registration.portfolios,
        jobInterest: registration.job_interest,
        isInterestedMechMania: registration.is_interested_mech_mania,
        isInterestedPuzzleBang: registration.is_interested_puzzle_bang,
        hasResume: registration.has_resume,
        hasSubmitted: registration.has_submitted,
        degree: registration.degree,
    };

    return res
        .status(StatusCodes.OK)
        .json({ registration: formattedRegistration });
});

registrationRouter.post(
    "/filter/pagecount",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.CORPORATE]),
    async (req, res) => {
        const { graduations, majors, jobInterests, degrees } =
            RegistrationFilterValidator.parse(req.body);

        let query = SupabaseDB.REGISTRATIONS.select(
            "user_id, name, major, graduation, degree, job_interest, portfolios"
        )
            .eq("has_submitted", true)
            .eq("has_resume", true);

        if (graduations && graduations.length > 0) {
            query = query.in("graduation", graduations);
        }

        if (majors && majors.length > 0) {
            query = query.in("major", majors);
        }

        if (degrees && degrees.length > 0) {
            query = query.in("degree", degrees);
        }

        if (jobInterests && jobInterests.length > 0) {
            query = query.overlaps("job_interest", jobInterests);
        }

        const { data: registrants } = await query.throwOnError();

        return res.status(StatusCodes.OK).json({
            pagecount: Math.floor(
                (registrants.length + Config.SPONSOR_ENTIRES_PER_PAGE - 1) /
                    Config.SPONSOR_ENTIRES_PER_PAGE
            ),
        });
    }
);

registrationRouter.post(
    "/filter/:PAGE",
    RoleChecker([Role.Enum.ADMIN, Role.Enum.CORPORATE]),
    async (req, res) => {
        const page = parseInt(req.params.PAGE, 10);
        const { graduations, majors, jobInterests, degrees } =
            RegistrationFilterValidator.parse(req.body);

        if (!page || page <= 0) {
            return res.status(StatusCodes.BAD_REQUEST).send("Invalid Page");
        }

        let query = SupabaseDB.REGISTRATIONS.select(
            "user_id, name, major, graduation, degree, job_interest, portfolios"
        )
            .eq("has_submitted", true)
            .eq("has_resume", true);

        if (graduations && graduations.length > 0) {
            query = query.in("graduation", graduations);
        }

        if (majors && majors.length > 0) {
            query = query.in("major", majors);
        }

        if (degrees && degrees.length > 0) {
            query = query.in("degree", degrees);
        }

        if (jobInterests && jobInterests.length > 0) {
            query = query.overlaps("job_interest", jobInterests);
        }

        const startIndex = Config.SPONSOR_ENTIRES_PER_PAGE * (page - 1);
        const endIndex = startIndex + Config.SPONSOR_ENTIRES_PER_PAGE - 1;
        query = query.range(startIndex, endIndex);

        const { data: dbRegistrants } = await query.throwOnError();

        const registrants = dbRegistrants.map((registrant) => ({
            userId: registrant.user_id,
            name: registrant.name,
            major: registrant.major,
            graduation: registrant.graduation,
            degree: registrant.degree,
            jobInterest: registrant.job_interest,
            portfolios: registrant.portfolios,
        }));

        return res.status(StatusCodes.OK).json({ registrants, page });
    }
);

export default registrationRouter;
