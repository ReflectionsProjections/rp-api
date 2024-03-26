import mongoose, { Schema } from "mongoose";
import { RoleInfo, RoleSchema } from "./services/auth/auth-schema";

function initializeModel(
    modelName: string,
    schema: Schema,
    object: Zod.AnyZodObject
) {
    schema.pre("validate", function (next) {
        const data = this.toObject();
        try {
            // Validate the data against the Zod schema
            object.parse(data);
            next();
        } catch (error) {
            next(new Error(error as string));
        }
    });

    return mongoose.model(modelName, schema);
}

// Example usage
export const Database = {
    ROLES: initializeModel("role", RoleSchema, RoleInfo),
};
