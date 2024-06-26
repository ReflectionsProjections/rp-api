import mongoose, { Schema, Document } from "mongoose";
import {
    AttendeeSchema,
    AttendeeValidator,
} from "./services/attendees/attendee-schema";
import { RoleValidator, RoleSchema } from "./services/auth/auth-schema";
import {
    EventSchema,
    privateEventValidator,
} from "./services/events/events-schema";
import {
    RegistrationSchema,
    RegistrationValidator,
} from "./services/registration/registration-schema";
import {
    SubscriptionSchemaValidator,
    SubscriptionSchema,
} from "./services/subscription/subscription-schema";
import {
    NotificationsSchema,
    NotificationsValidator,
} from "./services/notifications/notifications-schema";

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
        transform(doc, ret) {
            delete ret._id;
            delete ret.__v;
        },
    });

    type objectType = Zod.infer<typeof object>;
    interface modelType extends Document, objectType {}
    return mongoose.model<modelType>(modelName, schema);
}

// Example usage
export const Database = {
    ROLES: initializeModel("roles", RoleSchema, RoleValidator),
    EVENTS: initializeModel("events", EventSchema, privateEventValidator),
    SUBSCRIPTIONS: initializeModel(
        "subscriptions",
        SubscriptionSchema,
        SubscriptionSchemaValidator
    ),
    ATTENDEES: initializeModel("attendees", AttendeeSchema, AttendeeValidator),
    REGISTRATION: initializeModel(
        "registration",
        RegistrationSchema,
        RegistrationValidator
    ),
    NOTIFICATIONS: initializeModel(
        "notifications",
        NotificationsSchema,
        NotificationsValidator
    ),
};
