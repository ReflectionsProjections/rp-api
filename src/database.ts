import mongoose, { Schema, Document, InferSchemaType } from "mongoose";
import {
    AttendeeAttendanceSchema,
    AttendeeSchema,
} from "./services/attendee/attendee-schema";
import {
    EventSchema,
    internalEventView,
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
    SponsorAuthSchema,
    SponsorAuthValidator,
} from "./services/auth/sponsor/sponsor-schema";
import {
    CorporateSchema,
    CorporateValidator,
} from "./services/auth/corporate-schema";
import {
    MeetingSchema,
    meetingView,
} from "./services/meetings/meetings-schema";
import { AnyZodObject } from "zod";

mongoose.set("toObject", { versionKey: false });

function initializeModel<T extends Schema>(
    modelName: string,
    schema: T,
    object: AnyZodObject
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

    return mongoose.model<Document & InferSchemaType<T>>(modelName, schema);
}

// Example usage
export const Database = {
    ROLES: initializeModel("roles", RoleSchema, RoleValidator),
    EVENTS: initializeModel("events", EventSchema, internalEventView),
    EVENTS_ATTENDANCE: initializeModel(
        "events_attendance",
        EventAttendanceSchema,
        EventAttendanceValidator
    ),
    ATTENDEE: mongoose.model("attendee", AttendeeSchema),
    ATTENDEE_ATTENDANCE: mongoose.model(
        "attendee_attendance",
        AttendeeAttendanceSchema
    ),
    // STAFF: initializeModel("staff", StaffSchema, StaffValidator),
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
    AUTH_CODES: initializeModel(
        "auth_codes",
        SponsorAuthSchema,
        SponsorAuthValidator
    ),
    SPEAKERS: initializeModel("speakers", SpeakerSchema, SpeakerValidator),
    CORPORATE: initializeModel(
        "corporate",
        CorporateSchema,
        CorporateValidator
    ),
    MEETINGS: initializeModel("meetings", MeetingSchema, meetingView),
};
