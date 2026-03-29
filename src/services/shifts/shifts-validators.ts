import { z } from "zod";
import { ShiftRoleType } from "../../database";
import { Tables } from "../../database.types";
import { registry } from "../../middleware/openapi-registry";

const ShiftRoleTypeEnumValues: [ShiftRoleType, ...ShiftRoleType[]] = [
    "CLEAN_UP",
    "DINNER",
    "CHECK_IN",
    "SPEAKER_BUDDY",
    "SPONSOR_BUDDY",
    "DEV_ON_CALL",
    "CHAIR_ON_CALL",
];

export const ShiftRoleTypeEnum = registry.register(
    "ShiftRoleTypeEnum",
    z
        .enum(ShiftRoleTypeEnumValues)
        .openapi("ShiftRoleTypeEnum", { description: "Staff shift role type" })
);

// Zod schema for creating a new shift
export const ShiftCreateValidator = registry.register(
    "ShiftCreateValidator",
    z
        .object({
            name: z
                .string()
                .min(1, "Shift name is required")
                .max(100, "Shift name must be less than 100 characters"),
            role: z.enum(ShiftRoleTypeEnumValues, {
                errorMap: () => ({ message: "Invalid shift role type" }),
            }),
            startTime: z.string().datetime("Invalid start time format"),
            endTime: z.string().datetime("Invalid end time format"),
            location: z
                .string()
                .min(1, "Location is required")
                .max(200, "Location must be less than 200 characters"),
        })
        .openapi("ShiftCreateValidator", {
            example: {
                name: "Morning Check-In",
                role: "CHECK_IN",
                startTime: "2025-04-01T08:00:00Z",
                endTime: "2025-04-01T10:00:00Z",
                location: "Siebel Center Lobby",
            },
        })
        .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
            message: "End time must be after start time",
            path: ["endTime"],
        })
);

// Zod schema for updating a shift
export const ShiftUpdateValidator = registry.register(
    "ShiftUpdateValidator",
    z
        .object({
            name: z
                .string()
                .min(1, "Shift name is required")
                .max(100, "Shift name must be less than 100 characters")
                .optional(),
            role: z
                .enum(ShiftRoleTypeEnumValues, {
                    errorMap: () => ({ message: "Invalid shift role type" }),
                })
                .optional(),
            startTime: z
                .string()
                .datetime("Invalid start time format")
                .optional(),
            endTime: z
                .string()
                .datetime("Invalid end time format")
                .optional(),
            location: z
                .string()
                .min(1, "Location is required")
                .max(200, "Location must be less than 200 characters")
                .optional(),
        })
        .openapi("ShiftUpdateValidator", {
            example: { location: "DCL 1320" },
        })
        .refine(
            (data) => {
                // Only validate time order if both times are provided
                if (data.startTime && data.endTime) {
                    return new Date(data.startTime) < new Date(data.endTime);
                }
                return true;
            },
            {
                message: "End time must be after start time",
                path: ["endTime"],
            }
        )
);

// Zod schema for shift ID parameter
export const ShiftIdValidator = z.object({
    shiftId: z.string().uuid("Invalid shift ID format"),
});

// Zod schema for assigning staff to a shift
export const StaffEmailValidator = registry.register(
    "StaffEmailValidator",
    z
        .object({ staffEmail: z.string().email("Invalid email format") })
        .openapi("StaffEmailValidator", {
            example: { staffEmail: "volunteer@illinois.edu" },
        })
);

export const ShiftView = registry.register(
    "ShiftView",
    z
        .object({
            shiftId: z.string().uuid(),
            name: z.string(),
            role: ShiftRoleTypeEnum,
            startTime: z.string().openapi({ format: "date-time" }),
            endTime: z.string().openapi({ format: "date-time" }),
            location: z.string(),
        })
        .openapi("ShiftView", {
            example: {
                shiftId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                name: "Morning Check-In",
                role: "CHECK_IN",
                startTime: "2025-04-01T08:00:00Z",
                endTime: "2025-04-01T10:00:00Z",
                location: "Siebel Center Lobby",
            },
        })
);

export const ShiftAssignmentView = registry.register(
    "ShiftAssignmentView",
    z
        .object({
            shiftId: z.string().uuid(),
            staffEmail: z.string().email(),
            acknowledged: z.boolean(),
        })
        .openapi("ShiftAssignmentView", {
            example: {
                shiftId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                staffEmail: "volunteer@illinois.edu",
                acknowledged: false,
            },
        })
);

export type ShiftCreateRequest = z.infer<typeof ShiftCreateValidator>;
export type ShiftUpdateRequest = z.infer<typeof ShiftUpdateValidator>;
export type ShiftIdParams = z.infer<typeof ShiftIdValidator>;
export type ShiftAssignmentRequest = z.infer<typeof StaffEmailValidator>;
export type Shift = Tables<"shifts">;
export type ShiftAssignment = Tables<"shiftAssignments">;
