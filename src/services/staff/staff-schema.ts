import { z } from "zod";
import { CommitteeTypes } from "../../database";
import { registry } from "../../middleware/openapi-registry";

export enum StaffAttendanceTypeEnum {
    PRESENT = "PRESENT",
    EXCUSED = "EXCUSED",
    ABSENT = "ABSENT",
}
export const StaffAttendanceType = registry.register(
    "StaffAttendanceType",
    z.nativeEnum(StaffAttendanceTypeEnum).openapi("StaffAttendanceType", {
        description: "Attendance status for a staff meeting",
    })
);
export type AttendancesMap = Record<string, StaffAttendanceTypeEnum>;

// Zod schema for staff
export const StaffValidator = registry.register(
    "StaffView",
    z
        .object({
            email: z.coerce.string(),
            name: z.string(),
            team: z.nativeEnum(CommitteeTypes).openapi({
                description: "Committee the staff member belongs to",
            }),
            // add preprocessor to convert a map into a plain javascript object
            attendances: z
                .preprocess((val) => {
                    // If the value is an instance of Map, convert it to a plain object
                    if (val instanceof Map) {
                        return Object.fromEntries(val);
                    }
                    return val;
                }, z.record(z.string()))
                .default({}),
        })
        .openapi("StaffView", {
            example: {
                email: "volunteer@illinois.edu",
                name: "Jane Doe",
                team: "DEV",
                attendances: {
                    "3a72d491-c2f9-4baf-af5a-55713621d978": "PRESENT",
                },
            },
        })
);
export type Staff = z.infer<typeof StaffValidator>;

export const CheckInValidator = registry.register(
    "CheckInValidator",
    z.object({ meetingId: z.string() }).openapi("CheckInValidator", {
        example: { meetingId: "3a72d491-c2f9-4baf-af5a-55713621d978" },
    })
);

export const UpdateStaffAttendanceValidator = registry.register(
    "UpdateStaffAttendanceValidator",
    z
        .object({
            meetingId: z.string(),
            attendanceType: StaffAttendanceType,
        })
        .openapi("UpdateStaffAttendanceValidator", {
            example: {
                meetingId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                attendanceType: StaffAttendanceTypeEnum.PRESENT,
            },
        })
);

// // Mongoose schema for staff
// export const StaffSchema = new Schema({
//     email: {
//         type: String,
//         required: true,
//         unique: true,
//         default: () => uuidv4(),
//     },
//     name: {
//         type: String,
//         required: true,
//     },
//     team: {
//         type: CommitteeTypes,
//         required: true,
//     },
//     attendances: {
//         type: Map,
//         of: String,
//         default: {},
//         required: true,
//     },
// });
