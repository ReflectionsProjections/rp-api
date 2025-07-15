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
    user_id: z.string(),
    display_name: z.string(),
    // email: z.string().email(),
    roles: Role.array(),
});

export type JwtPayloadType = z.infer<typeof JwtPayloadValidator>;
