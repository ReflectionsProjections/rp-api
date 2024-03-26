import { Schema } from "mongoose";
import { z } from "zod";

export const Role = z.enum(["USER", "ADMIN", "CORPORATE"]);

export const RoleInfo = z.object({
    email: z.coerce.string().email(),
    roles: z.array(Role),
});

export const RoleSchema = new Schema({
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
