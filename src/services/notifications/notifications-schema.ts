import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for notifications
const NotificationsValidator = z.object({
    userId: z.coerce.string().regex(/user[0-9]*/),
    deviceId: z.string(),
});

// Mongoose schema for notifications
const NotificationsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true },
});

export { NotificationsSchema, NotificationsValidator };
