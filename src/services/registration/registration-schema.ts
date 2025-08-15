import { z } from "zod";

// Zod schema for registration drafts
const RegistrationDraftValidator = z.object({
    allergies: z.array(z.string()),
    allergiesOther: z.string(),
    dietaryRestrictions: z.array(z.string()),
    dietaryOther: z.string(),
    educationLevel: z.string(),
    educationOther: z.string(),
    email: z.string(),
    ethnicity: z.array(z.string()),
    ethnicityOther: z.string(),
    gender: z.string(),
    genderOther: z.string(),
    graduationYear: z.string(),
    howDidYouHear: z.array(z.string()),
    majors: z.array(z.string()),
    minors: z.array(z.string()),
    name: z.string(),
    opportunities: z.array(z.string()),
    personalLinks: z.array(z.string()),
    resume: z.string(),
    school: z.string(),
    isInterestedMechMania: z.boolean(),
    isInterestedPuzzleBang: z.boolean(),
    tags: z.array(z.string()),
});

// Zod schema for registration
const RegistrationValidator = z.object({
    allergies: z.array(z.string()),
    dietaryRestrictions: z.array(z.string()),
    educationLevel: z.string(),
    email: z.string().email(),
    ethnicity: z.array(z.string()),
    gender: z.string(),
    graduationYear: z.string(),
    howDidYouHear: z.array(z.string()),
    majors: z.array(z.string()),
    minors: z.array(z.string()),
    name: z.string(),
    opportunities: z.array(z.string()),
    personalLinks: z.array(z.string()),
    resume: z.string(),
    school: z.string(),
    isInterestedMechMania: z.boolean(),
    isInterestedPuzzleBang: z.boolean(),
    tags: z.array(z.string()),
});

export { RegistrationDraftValidator, RegistrationValidator };
