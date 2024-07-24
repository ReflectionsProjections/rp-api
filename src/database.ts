import mongoose, { Schema, Document } from "mongoose";
import {
    AttendeeSchema,
    AttendeeValidator,
} from "./services/attendee/attendee-schema";
import {
    AttendeeAttendanceSchema,
    AttendeeAttendanceValidator,
} from "./services/attendee/attendee-schema";
import {
    EventSchema,
    privateEventValidator,
} from "./services/events/events-schema";
import {
    EventAttendanceSchema,
    EventAttendanceValidator,
} from "./services/events/events-schema";
import { RoleValidator, RoleSchema } from "./services/auth/auth-schema";
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
import {
    SpeakerSchema,
    SpeakerValidator,
} from "./services/speakers/speakers-schema";
import {
    SponsorSchema,
    SponsorValidator,
} from "./services/auth/sponsor/sponsor-schema";
import {
    CorporateSchema,
    CorporateValidator,
} from "./services/auth/corporate-schema";

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
    EVENTS_ATTENDANCE: initializeModel(
        "events_attendance",
        EventAttendanceSchema,
        EventAttendanceValidator
    ),
    ATTENDEE: initializeModel("attendee", AttendeeSchema, AttendeeValidator),
    ATTENDEE_ATTENDANCE: initializeModel(
        "attendee_attendance",
        AttendeeAttendanceSchema,
        AttendeeAttendanceValidator
    ),
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
    NOTIFICATIONS: initializeModel(
        "notifications",
        NotificationsSchema,
        NotificationsValidator
    ),
    AUTH_CODES: initializeModel("auth_codes", SponsorSchema, SponsorValidator),
    SPEAKERS: initializeModel("speakers", SpeakerSchema, SpeakerValidator),
    CORPORATE: initializeModel(
        "corporate",
        CorporateSchema,
        CorporateValidator
    ),
};
