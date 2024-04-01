import mongoose from "mongoose";
import { z } from "zod";


// Zod schema for attendee
const CreateAttendeeSchema = z.object({
    name: z.string(),
    email: z.string().email(),
});


// Mongoose schema for attendee
const AttendeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
});


export const AttendeeModel = mongoose.model("Attendee", AttendeeSchema);
export { CreateAttendeeSchema };