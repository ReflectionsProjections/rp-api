import { z } from "zod";

export const Role = z.enum(["USER", "ADMIN", "CORPORATE"]);

export const JwtPayload =  z.object({
    userId: z.string(),
    roles: Role.array(),
})