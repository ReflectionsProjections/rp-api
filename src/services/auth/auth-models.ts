import { z } from "zod";

export const Role = z.enum([
    "USER",
    "STAFF",
    "ADMIN",
    "CORPORATE",
    "PUZZLEBANG",
]);

export const JwtPayloadValidator = z.object({
    userId: z.string(),
    displayName: z.string(),
    roles: Role.array(),
});

export type JwtPayloadType = z.infer<typeof JwtPayloadValidator>;
