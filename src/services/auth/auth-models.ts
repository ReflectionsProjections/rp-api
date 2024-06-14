import { z } from "zod";

export const Role = z.enum(["USER", "STAFF", "ADMIN", "CORPORATE"]);

export const JwtPayloadValidator = z.object({
    userId: z.string(),
    name: z.string(),
    roles: Role.array(),
});
