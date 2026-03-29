import { z } from "zod";
import { Database } from "../../database.types";
import { registry } from "../../middleware/openapi-registry";

// Zod schema for registration drafts
const RegistrationDraftValidator = registry.register(
    "RegistrationDraftValidator",
    z
        .object({
            allergies: z.array(z.string().max(50)).max(10),
            allergiesOther: z.string().max(50),
            dietaryRestrictions: z.array(z.string().max(50)).max(10),
            dietaryOther: z.string().max(50),
            educationLevel: z.string().max(50),
            educationOther: z.string().max(50),
            email: z.string().max(256),
            ethnicity: z.array(z.string().max(50)).max(10),
            ethnicityOther: z.string().max(50),
            gender: z.string().max(50),
            genderOther: z.string().max(50),
            graduationYear: z.string().max(50),
            howDidYouHear: z.array(z.string().max(50)).max(10),
            majors: z.array(z.string().max(50)).max(5),
            minors: z.array(z.string().max(50)).max(5),
            name: z.string().max(50),
            opportunities: z.array(z.string().max(50)).max(10),
            personalLinks: z.array(z.string().max(50)).max(3),
            resume: z.string().max(50).optional(),
            school: z.string().max(50),
            isInterestedMechMania: z.boolean(),
            isInterestedPuzzleBang: z.boolean(),
            tags: z.array(z.string().max(50)).max(15),
        })
        .openapi("RegistrationDraftValidator", {
            example: {
                allergies: [],
                allergiesOther: "",
                dietaryRestrictions: [],
                dietaryOther: "",
                educationLevel: "Undergraduate",
                educationOther: "",
                email: "hacker@example.com",
                ethnicity: [],
                ethnicityOther: "",
                gender: "Prefer not to say",
                genderOther: "",
                graduationYear: "2026",
                howDidYouHear: ["Social media"],
                majors: ["Computer Science"],
                minors: [],
                name: "Jane Doe",
                opportunities: [],
                personalLinks: [],
                school: "University of Illinois Urbana-Champaign",
                isInterestedMechMania: false,
                isInterestedPuzzleBang: true,
                tags: ["AI"],
            },
        })
);

// Zod schema for registration
const RegistrationValidator = registry.register(
    "RegistrationValidator",
    z
        .object({
            allergies: z.array(z.string().max(50)).max(10),
            dietaryRestrictions: z.array(z.string().max(50)).max(10),
            educationLevel: z.string().max(50),
            email: z.string().email().max(256),
            ethnicity: z.array(z.string().max(50)).max(10),
            gender: z.string().max(50),
            graduationYear: z.string().max(50),
            howDidYouHear: z.array(z.string().max(50)).max(10),
            majors: z.array(z.string().max(50)).max(5),
            minors: z.array(z.string().max(50)).max(5),
            name: z.string().max(50),
            opportunities: z.array(z.string().max(50)).max(10),
            personalLinks: z.array(z.string().max(50)).max(3),
            hasResume: z.boolean(),
            school: z.string().max(50),
            isInterestedMechMania: z.boolean(),
            isInterestedPuzzleBang: z.boolean(),
            tags: z.array(z.string().max(50)).max(15),
        })
        .openapi("RegistrationValidator", {
            example: {
                allergies: [],
                dietaryRestrictions: [],
                educationLevel: "Undergraduate",
                email: "hacker@example.com",
                ethnicity: [],
                gender: "Prefer not to say",
                graduationYear: "2026",
                howDidYouHear: ["Social media"],
                majors: ["Computer Science"],
                minors: [],
                name: "Jane Doe",
                opportunities: [],
                personalLinks: [],
                hasResume: true,
                school: "University of Illinois Urbana-Champaign",
                isInterestedMechMania: false,
                isInterestedPuzzleBang: true,
                tags: ["AI"],
            },
        })
);

export const RegistrationSummaryView = registry.register(
    "RegistrationSummaryView",
    z
        .object({
            userId: z.string(),
            name: z.string(),
            majors: z.array(z.string()),
            minors: z.array(z.string()),
            school: z.string(),
            educationLevel: z.string(),
            graduationYear: z.string(),
            opportunities: z.array(z.string()),
            personalLinks: z.array(z.string()),
        })
        .openapi("RegistrationSummaryView", {
            description:
                "Subset of registration fields returned to corporate/admin for resume review.",
            example: {
                userId: "user_abc123",
                name: "Jane Doe",
                majors: ["Computer Science"],
                minors: [],
                school: "University of Illinois Urbana-Champaign",
                educationLevel: "Undergraduate",
                graduationYear: "2026",
                opportunities: ["Internship"],
                personalLinks: ["github.com/janedoe"],
            },
        })
);

export type Registration = Database["public"]["Tables"]["registrations"]["Row"];

export { RegistrationDraftValidator, RegistrationValidator };
