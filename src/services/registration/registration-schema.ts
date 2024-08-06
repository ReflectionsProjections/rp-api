import { Schema } from "mongoose";

// Mongoose schema for registration
export const RegistrationSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    university: { type: String, required: true },
    graduation: { type: String, default: null },
    major: { type: String, default: null },
    dietaryRestrictions: [{ type: String, required: true }],
    allergies: [{ type: String, required: true }],
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    race: [{ type: String }],
    ethnicity: [{ type: String }],
    firstGen: { type: String, default: null },
    hearAboutRP: [{ type: String }],
    portfolio: { type: String, default: null },
    jobInterest: [{ type: String }],
    isInterestedMechMania: { type: Boolean },
    isInterestedPuzzleBang: { type: Boolean },
    hasResume: { type: Boolean, default: false },
    hasSubmitted: { type: Boolean, default: false },
});
