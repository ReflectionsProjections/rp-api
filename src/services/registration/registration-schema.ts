import { z } from "zod";
import { Database } from "../../database.types";

// Zod schema for registration drafts
const RegistrationDraftValidator = z.object({
    allergies: z.array(z.string().max(50)).max(10),
    allergiesOther: z.string().max(50),
    dietaryRestrictions: z.array(z.string().max(50)).max(10),
    dietaryOther: z.string().max(50),
    educationLevel: z.string().max(50),
    educationOther: z.string().max(50),
    email: z.string().max(50),
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
});

// Zod schema for registration
const RegistrationValidator = z.object({
    allergies: z.array(z.string().max(50)).max(10),
    dietaryRestrictions: z.array(z.string().max(50)).max(10),
    educationLevel: z.string().max(50),
    email: z.string().email().max(50),
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
});

export type Registration = Database["public"]["Tables"]["registrations"]["Row"];

export { RegistrationDraftValidator, RegistrationValidator };
