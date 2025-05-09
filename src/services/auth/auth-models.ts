import { z } from "zod";

export const Role = z.enum([
    "USER",
    "STAFF",
    "ADMIN",
    "CORPORATE",
    "PUZZLEBANG",
]);
export type Role = z.infer<typeof Role>;

export const JwtPayloadValidator = z.object({
    userId: z.string(),
    displayName: z.string(),
    email: z.string().email(),
    roles: Role.array(),
});

export type JwtPayloadType = z.infer<typeof JwtPayloadValidator>;
