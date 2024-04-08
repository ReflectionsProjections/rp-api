import { Schema } from "mongoose";
import { z } from "zod";

export const Role = z.enum(["USER", "ADMIN", "CORPORATE"]);

export const Devices = z.enum(["web"]);

export const RoleValidator = z.object({
    userId: z.coerce.string().regex(/user[0-9]*/),
    email: z.coerce.string().email(),
    roles: z.array(Role),
});

export const RoleSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    roles: {
        type: [String],
        enum: Role.Values,
        default: [],
        required: true,
    },
});
