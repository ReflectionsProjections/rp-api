import { z } from "zod";
import { CommitteeTypes } from "../../database";

// Zod schema for staff
export const StaffValidator = z.object({
    email: z.coerce.string(),
    name: z.string(),
    team: z.nativeEnum(CommitteeTypes),

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
});
export type Staff = z.infer<typeof StaffValidator>;

export enum StaffAttendanceTypeEnum {
    PRESENT = "PRESENT",
    EXCUSED = "EXCUSED",
    ABSENT = "ABSENT",
}
export const StaffAttendanceType = z.nativeEnum(StaffAttendanceTypeEnum);
export type AttendancesMap = Record<string, StaffAttendanceTypeEnum>;

export const CheckInValidator = z.object({
    meetingId: z.string(),
});

export const UpdateStaffAttendanceValidator = z.object({
    meetingId: z.string(),
    attendanceType: StaffAttendanceType,
});

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
