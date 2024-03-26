import { Schema } from "mongoose";
import { z } from "zod";

export const Role = z.enum(["USER", "ADMIN", "CORPORATE"]);

export const RoleInfo = z.object({
    userId: z.coerce.string().cuid2(),
    roles: z.array(Role),
});

export const RoleSchema = new Schema({
    userId: {
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
