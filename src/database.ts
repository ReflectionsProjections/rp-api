import mongoose, { Schema } from "mongoose";
import { RoleValidator, RoleSchema } from "./services/auth/auth-schema";
import { EventSchema, EventValidator } from "./services/events/events-schema";
import {
    SubscriptionSchemaValidator,
    SubscriptionSchema,
} from "./services/subscription/subscription-schema";
import {
    RegistrationSchema,
    RegistrationValidator,
} from "./services/registration/registration-schema";

mongoose.set("toObject", { versionKey: false });

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

    schema.set("toObject", {
        transform: function (doc, ret) {
            delete ret._id;
            delete ret.__v;
        },
    });

    return mongoose.model(modelName, schema);
}

// Example usage
export const Database = {
    ROLES: initializeModel("roles", RoleSchema, RoleValidator),
    EVENTS: initializeModel("events", EventSchema, EventValidator),
    SUBSCRIPTIONS: initializeModel(
        "subscriptions",
        SubscriptionSchema,
        SubscriptionSchemaValidator
    ),
    REGISTRATION: initializeModel(
        "registration",
        RegistrationSchema,
        RegistrationValidator
    ),
};
