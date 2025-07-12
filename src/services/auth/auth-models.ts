import { z } from "zod";

export const Role = z.enum([
    "USER",
    "STAFF",
    "ADMIN",
    "CORPORATE",
    "PUZZLEBANG",
]);
export type Role = z.infer<typeof Role>;

export const Platform = z.enum(["WEB", "IOS"]); // TODO: add ANDROID
export type Platform = z.infer<typeof Platform>;

export const JwtPayloadValidator = z.object({
    userId: z.string(),
    displayName: z.string(),
    email: z.string().email(),
    roles: Role.array(),
});

export type JwtPayloadType = z.infer<typeof JwtPayloadValidator>;
