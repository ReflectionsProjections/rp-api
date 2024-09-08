import { z } from "zod";

// Zod schema for registration
export const RegistrationValidator = z.object({
    name: z.string(),
    email: z.string().email(),
    university: z.string(),
    graduation: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
    dietaryRestrictions: z.string().array(),
    allergies: z.string().array(),
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    race: z.array(z.string()).nullable().optional(),
    ethnicity: z.array(z.string()).nullable().optional(),
    firstGen: z.string().nullable().optional(),
    hearAboutRP: z.array(z.string()).nullable().optional(),
    portfolio: z.string().nullable().optional(),
    jobInterest: z.array(z.string()).nullable().optional(),
    isInterestedMechMania: z.boolean(),
    isInterestedPuzzleBang: z.boolean(),
    hasResume: z.boolean().default(false),
    hasSubmitted: z.boolean().optional(),
});

// Partial schema for attendee filter
const PartialRegistrationValidator = RegistrationValidator.partial();

export const RegistrationFilterValidator = z.object({
    filter: PartialRegistrationValidator,
    projection: z.array(
        z.record(PartialRegistrationValidator.keyof(), z.number().min(1).max(1))
    ),
});
