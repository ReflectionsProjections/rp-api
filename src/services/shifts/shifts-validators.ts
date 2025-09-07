import { z } from "zod";
import { ShiftRoleType } from "../../database";

const ShiftRoleTypeEnumValues: [ShiftRoleType, ...ShiftRoleType[]] = [
    "CLEAN_UP",
    "DINNER",
    "CHECK_IN",
    "SPEAKER_BUDDY",
    "SPONSOR_BUDDY",
    "DEV_ON_CALL",
    "CHAIR_ON_CALL",
];

// Shift role type enum values

// Zod schema for creating a new shift
export const ShiftCreateValidator = z
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
    .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
        message: "End time must be after start time",
        path: ["endTime"],
    });

// Zod schema for updating a shift
export const ShiftUpdateValidator = z
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
        startTime: z.string().datetime("Invalid start time format").optional(),
        endTime: z.string().datetime("Invalid end time format").optional(),
        location: z
            .string()
            .min(1, "Location is required")
            .max(200, "Location must be less than 200 characters")
            .optional(),
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
    );

// Zod schema for shift ID parameter
export const ShiftIdValidator = z.object({
    shiftId: z.string().uuid("Invalid shift ID format"),
});

// Zod schema for assigning staff to a shift
export const StaffEmailValidator = z.object({
    staffEmail: z.string().email("Invalid email format"),
});

export type ShiftCreateRequest = z.infer<typeof ShiftCreateValidator>;
export type ShiftUpdateRequest = z.infer<typeof ShiftUpdateValidator>;
export type ShiftIdParams = z.infer<typeof ShiftIdValidator>;
export type ShiftAssignmentRequest = z.infer<typeof StaffEmailValidator>;
