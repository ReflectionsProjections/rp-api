import mongoose, { Schema } from "mongoose";
import { RoleInfo, RoleSchema } from "./services/auth/auth-schema";
import { EventValidator, EventSchema } from "./services/events/event-schema";
import {
    AttendeeSchema,
    AttendeeValidator,
} from "./services/attendees/attendee-schema";
import {
    RegistrationSchema,
    RegistrationValidator,
} from "./services/registration/registration-schema";
import {
    SubscriptionValidator,
    SubscriptionSchema,
} from "./services/subscription/subscription-schema";

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
    ROLES: initializeModel("roles", RoleSchema, RoleInfo),
    EVENTS: initializeModel("events", EventSchema, EventValidator),
    ATTENDEES: initializeModel("attendees", AttendeeSchema, AttendeeValidator),
    REGISTRATION: initializeModel(
        "registration",
        RegistrationSchema,
        RegistrationValidator
    ),
    SUBSCRIPTION: initializeModel(
        "subscription",
        SubscriptionSchema,
        SubscriptionValidator
    ),
};
