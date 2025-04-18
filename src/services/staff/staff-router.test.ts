import { StatusCodes } from "http-status-codes";
import {
    postAsAdmin,
    postAsStaff,
    TESTER,
} from "../../../testing/testingTools";
import Config from "../../config";
import { Database } from "../../database";
import { CommitteeNames, Meeting } from "../meetings/meetings-schema";
import { Staff, StaffAttendanceTypeEnum, StaffValidator } from "./staff-schema";

const MEETING = {
    meetingId: "meeting-abc123",
    committeeType: "DEV",
    startTime: new Date(),
} satisfies Meeting;

const TESTER_STAFF = {
    userId: TESTER.userId,
    name: TESTER.displayName,
    team: CommitteeNames.Enum.DEV,
    attendances: {},
};

const OTHER_STAFF = {
    userId: "other-staff-user123",
    name: "other-staff",
    team: CommitteeNames.Enum.DEV,
    attendances: {},
} satisfies Staff;

beforeEach(async () => {
    await Database.MEETINGS.create(MEETING);
    await Database.STAFF.create(StaffValidator.parse(TESTER_STAFF));
    await Database.STAFF.create(StaffValidator.parse(OTHER_STAFF));
});

describe("POST /staff/check-in", () => {
    it("fails if meeting is not found", async () => {
        const res = await postAsStaff("/staff/check-in")
            .send({
                meetingId: "nonexistent-id",
            })
            .expect(StatusCodes.NOT_FOUND);
        expect(res.body.error).toBe("NotFound");
    });

    it("fails if staff is already checked in", async () => {
        await Database.STAFF.updateOne(
            { userId: TESTER_STAFF.userId },
            {
                attendances: {
                    [MEETING.meetingId]: StaffAttendanceTypeEnum.PRESENT,
                },
            }
        );

        const res = await postAsStaff("/staff/check-in")
            .send({
                meetingId: MEETING.meetingId,
            })
            .expect(StatusCodes.BAD_REQUEST);
        expect(res.body.error).toBe("AlreadyCheckedIn");
    });

    it("fails if meeting is outside check-in window", async () => {
        await Database.MEETINGS.updateOne(
            { meetingId: MEETING.meetingId },
            {
                startTime: new Date(
                    Date.now() -
                        Config.STAFF_MEETING_CHECK_IN_WINDOW_SECONDS * 1000 * 2
                ),
            }
        );

        const res = await postAsStaff("/staff/check-in")
            .send({
                meetingId: MEETING.meetingId,
            })
            .expect(StatusCodes.BAD_REQUEST);
        expect(res.body.error).toBe("Expired");
    });

    it("successfully checks in", async () => {
        // Should still check in, even if close to end of check in window
        await Database.MEETINGS.updateOne(
            { meetingId: MEETING.meetingId },
            {
                startTime: new Date(
                    Date.now() -
                        (Config.STAFF_MEETING_CHECK_IN_WINDOW_SECONDS / 2) *
                            1000
                ),
            }
        );

        const res = await postAsStaff("/staff/check-in").send({
            meetingId: MEETING.meetingId,
        });
        expect(res.status).toBe(StatusCodes.OK);

        const updated = await Database.STAFF.findOne({
            userId: TESTER_STAFF.userId,
        });
        expect(updated?.toObject()).toMatchObject({
            ...TESTER_STAFF,
            attendances: new Map([
                [MEETING.meetingId, StaffAttendanceTypeEnum.PRESENT],
            ]),
        });
    });
});

describe("POST /staff/:USERID/attendance", () => {
    it("fails if meeting is not found", async () => {
        const res = await postAsAdmin(`/staff/${OTHER_STAFF.userId}/attendance`)
            .send({
                meetingId: "invalid-id",
                attendanceType: StaffAttendanceTypeEnum.EXCUSED,
            })
            .expect(StatusCodes.NOT_FOUND);

        expect(res.body.error).toBe("NotFound");
    });

    it("fails if staff is not found", async () => {
        const res = await postAsAdmin(`/staff/invalid-id/attendance`)
            .send({
                meetingId: MEETING.meetingId,
                attendanceType: StaffAttendanceTypeEnum.EXCUSED,
            })
            .expect(StatusCodes.NOT_FOUND);

        expect(res.body.error).toBe("NotFound");
    });

    it("adds attendance successfully", async () => {
        const res = await postAsAdmin(
            `/staff/${OTHER_STAFF.userId}/attendance`
        ).send({
            meetingId: MEETING.meetingId,
            attendanceType: StaffAttendanceTypeEnum.EXCUSED,
        });

        expect(res.status).toBe(StatusCodes.OK);

        const updated = await Database.STAFF.findOne({
            userId: OTHER_STAFF.userId,
        });
        expect(updated?.toObject()).toMatchObject({
            ...OTHER_STAFF,
            attendances: new Map([
                [MEETING.meetingId, StaffAttendanceTypeEnum.EXCUSED],
            ]),
        });
    });

    it("updates attendance successfully", async () => {
        const EXISTING_ATTENDANCES = {
            [MEETING.meetingId]: StaffAttendanceTypeEnum.PRESENT,
        };
        await Database.STAFF.updateOne(
            { userId: OTHER_STAFF.userId },
            {
                attendances: EXISTING_ATTENDANCES,
            }
        );

        const res = await postAsAdmin(
            `/staff/${OTHER_STAFF.userId}/attendance`
        ).send({
            meetingId: MEETING.meetingId,
            attendanceType: StaffAttendanceTypeEnum.EXCUSED,
        });

        expect(res.status).toBe(StatusCodes.OK);

        const updated = await Database.STAFF.findOne({
            userId: OTHER_STAFF.userId,
        });
        expect(updated?.toObject()).toMatchObject({
            ...OTHER_STAFF,
            attendances: new Map([
                ...Object.entries(EXISTING_ATTENDANCES),
                [MEETING.meetingId, StaffAttendanceTypeEnum.EXCUSED],
            ]),
        });
    });
});
