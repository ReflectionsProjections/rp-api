import { beforeEach, describe, expect, it } from "@jest/globals";
import {
    get,
    getAsStaff,
    getAsAdmin,
    post,
    postAsStaff,
    postAsAdmin,
    del,
    delAsStaff,
    delAsAdmin,
    TESTER,
} from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import Config from "../../config";
import { CommitteeNames } from "../meetings/meetings-schema";
import { Staff, StaffAttendanceTypeEnum, StaffValidator } from "./staff-schema";
import { v4 as uuidv4 } from "uuid";
import { Shift, ShiftAssignment } from "../shifts/shifts-validators";

const TESTER_STAFF = {
    email: TESTER.email,
    name: TESTER.displayName,
    team: CommitteeNames.Enum.DEV,
    attendances: {},
} satisfies Staff;

const MEETING = {
    meetingId: uuidv4(),
    committeeType: CommitteeNames.Enum.DEV,
    startTime: new Date().toISOString(),
};

const OTHER_STAFF = {
    email: "other_staff@test.com",
    name: "other-staff",
    team: CommitteeNames.Enum.DEV,
    attendances: {},
} satisfies Staff;

const NEW_STAFF_VALID = {
    email: "new_staff@test.com",
    name: "New Staff User 789",
    team: CommitteeNames.Enum.MARKETING,
    attendances: {},
} satisfies Staff;

const SHIFT = {
    shiftId: uuidv4(),
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 5000).toISOString(),
    location: "location",
    name: "shift name",
    role: "CHECK_IN",
} satisfies Shift;
const SHIFT_ASSIGNMENT = {
    shiftId: SHIFT.shiftId,
    acknowledged: false,
    staffEmail: TESTER_STAFF.email,
} satisfies ShiftAssignment;

const NON_EXISTENT_EMAIL = "nonExistentEmail@test.com";

beforeEach(async () => {
    await SupabaseDB.MEETINGS.insert(MEETING).throwOnError();
    await SupabaseDB.STAFF.insert(
        StaffValidator.parse(TESTER_STAFF)
    ).throwOnError();
    await SupabaseDB.STAFF.insert(
        StaffValidator.parse(OTHER_STAFF)
    ).throwOnError();
    await SupabaseDB.SHIFTS.insert(SHIFT).throwOnError();
    await SupabaseDB.SHIFT_ASSIGNMENTS.insert(SHIFT_ASSIGNMENT).throwOnError();
});

describe("GET /staff/", () => {
    it.each([
        { role: "ADMIN", description: "an ADMIN user", getter: getAsAdmin },
        { role: "STAFF", description: "a STAFF user", getter: getAsStaff },
    ])(
        "should return all staff records for $description:",
        async ({ getter }) => {
            const response = await getter("/staff/").expect(StatusCodes.OK);

            // Response should be an array of staff members where one of the users is our test user
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining(TESTER_STAFF),
                    expect.objectContaining(OTHER_STAFF),
                ])
            );
        },
        500000
    );

    it("should return an unauthorized error for an unauthenticated user", async () => {
        await get("/staff/").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return an empty array if no staff records exist", async () => {
        await SupabaseDB.STAFF.delete().throwOnError();
        const response = await getAsAdmin("/staff/").expect(StatusCodes.OK);
        expect(response.body).toEqual([]);
    });
});

describe("GET /staff/:EMAIL", () => {
    it.each([
        { role: "ADMIN", description: "an ADMIN user", getter: getAsAdmin },
        { role: "STAFF", description: "a STAFF user", getter: getAsStaff },
    ])(
        "should return correct staff data for $description requesting existing user",
        async ({ getter }) => {
            const response = await getter(
                `/staff/${TESTER_STAFF.email}`
            ).expect(StatusCodes.OK);
            expect(response.body).toMatchObject(TESTER_STAFF);
        }
    );

    it("should return an unauthorized error for an unauthenticated user", async () => {
        await get(`/staff/${TESTER_STAFF.email}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return not found for a non-existent user", async () => {
        const response = await getAsAdmin(
            `/staff/${NON_EXISTENT_EMAIL}`
        ).expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "UserNotFound" });
    });
});

describe("POST /staff/", () => {
    // success case
    it("should create and return new staff member", async () => {
        const response = await postAsAdmin("/staff/")
            .send(NEW_STAFF_VALID)
            .expect(StatusCodes.CREATED);
        expect(response.body).toMatchObject(NEW_STAFF_VALID);

        const createdStaff = await SupabaseDB.STAFF.select()
            .eq("email", NEW_STAFF_VALID.email)
            .single();
        expect(createdStaff.data).toMatchObject(NEW_STAFF_VALID);
    });

    // auth tests
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/staff/")
            .send(NEW_STAFF_VALID)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return FORBIDDEN for STAFF user", async () => {
        await postAsStaff("/staff/")
            .send(NEW_STAFF_VALID)
            .expect(StatusCodes.FORBIDDEN);
    });

    // bad request tests
    const invalidPayloads = [
        {
            description: "missing a required field",
            payload: {
                userId: NEW_STAFF_VALID.email,
                name: NEW_STAFF_VALID.name,
            },
        },
        {
            description: "provided field values do not match",
            payload: { ...NEW_STAFF_VALID, team: 69 },
        },
    ];

    it.each(invalidPayloads)(
        "should return BAD_REQUEST when $description",
        async ({ payload }) => {
            await postAsAdmin("/staff/")
                .send(payload)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );

    it("should ignore extra fields in the payload", async () => {
        const payloadWithExtra = {
            ...NEW_STAFF_VALID,
            extraField: "extra field that should be stripped by zod",
        };

        await postAsAdmin("/staff/")
            .send(payloadWithExtra)
            .expect(StatusCodes.CREATED);

        const createdStaff = await SupabaseDB.STAFF.select()
            .eq("email", NEW_STAFF_VALID.email)
            .single();
        expect(createdStaff.data).toMatchObject(NEW_STAFF_VALID);
    });

    // conflict request test
    it("should return BAD_REQUEST when userId already exists", async () => {
        const response = await postAsAdmin("/staff/")
            .send(TESTER_STAFF)
            .expect(StatusCodes.BAD_REQUEST);
        expect(response.body).toMatchObject({ error: "UserAlreadyExists" });
    });
});

describe("DELETE /staff/:EMAIL", () => {
    // success case
    it("should delete existing staff member and return NO_CONTENT", async () => {
        await delAsAdmin(`/staff/${TESTER_STAFF.email}`).expect(
            StatusCodes.NO_CONTENT
        );
        const deletedStaff = await SupabaseDB.STAFF.select()
            .eq("email", TESTER_STAFF.email)
            .maybeSingle()
            .throwOnError();
        expect(deletedStaff.data).toBeNull();

        // Make sure associated assignments are deleted as well
        const deletedStaffAssignments = await SupabaseDB.STAFF.select()
            .eq("email", TESTER_STAFF.email)
            .maybeSingle()
            .throwOnError();
        expect(deletedStaffAssignments.data).toBeNull();
    });

    // auth tests
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await del(`/staff/${TESTER_STAFF.email}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return FORBIDDEN for STAFF user", async () => {
        await delAsStaff(`/staff/${TESTER_STAFF.email}`).expect(
            StatusCodes.FORBIDDEN
        );
    });

    // not found test
    it("should return NOT_FOUND when trying to delete a staff member that doesn't exist", async () => {
        const response = await delAsAdmin(
            `/staff/${NON_EXISTENT_EMAIL}`
        ).expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "UserNotFound" });
    });
});

describe("POST /staff/check-in", () => {
    it("fails if meeting is not found", async () => {
        const res = await postAsStaff("/staff/check-in")
            .send({
                meetingId: uuidv4(),
            })
            .expect(StatusCodes.NOT_FOUND);
        expect(res.body.error).toBe("NotFound");
    });

    it("fails if staff is already checked in", async () => {
        await SupabaseDB.STAFF.update({
            attendances: {
                [MEETING.meetingId]: StaffAttendanceTypeEnum.PRESENT,
            },
        })
            .eq("email", TESTER_STAFF.email)
            .single();

        const res = await postAsStaff("/staff/check-in")
            .send({
                meetingId: MEETING.meetingId,
            })
            .expect(StatusCodes.BAD_REQUEST);
        expect(res.body.error).toBe("AlreadyCheckedIn");
    });

    it("fails if meeting is outside check-in window", async () => {
        await SupabaseDB.MEETINGS.update({
            startTime: new Date(
                Date.now() -
                    Config.STAFF_MEETING_CHECK_IN_WINDOW_SECONDS * 1000 * 2
            ).toISOString(),
        })
            .eq("meetingId", MEETING.meetingId)
            .select();

        const res = await postAsStaff("/staff/check-in")
            .send({
                meetingId: MEETING.meetingId,
            })
            .expect(StatusCodes.BAD_REQUEST);
        expect(res.body.error).toBe("Expired");
    });

    it("successfully checks in", async () => {
        // Should still check in, even if close to end of check in window

        await SupabaseDB.MEETINGS.update({
            startTime: new Date(
                Date.now() -
                    (Config.STAFF_MEETING_CHECK_IN_WINDOW_SECONDS / 2) * 1000
            ).toISOString(),
        })
            .eq("meetingId", MEETING.meetingId)
            .select();

        const res = await postAsStaff("/staff/check-in").send({
            meetingId: MEETING.meetingId,
        });
        expect(res.status).toBe(StatusCodes.OK);
        const updated = await SupabaseDB.STAFF.select()
            .eq("email", TESTER_STAFF.email)
            .single();
        expect(updated.data).toMatchObject({
            ...TESTER_STAFF,
            attendances: {
                [MEETING.meetingId]: StaffAttendanceTypeEnum.PRESENT,
            },
        });
    });
});

describe("POST /staff/:EMAIL/attendance", () => {
    it("fails if meeting is not found", async () => {
        const res = await postAsAdmin(`/staff/${OTHER_STAFF.email}/attendance`)
            .send({
                meetingId: uuidv4(),
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
            `/staff/${OTHER_STAFF.email}/attendance`
        ).send({
            meetingId: MEETING.meetingId,
            attendanceType: StaffAttendanceTypeEnum.EXCUSED,
        });

        expect(res.status).toBe(StatusCodes.OK);
        const updated = await SupabaseDB.STAFF.select()
            .eq("email", OTHER_STAFF.email)
            .single();
        expect(updated.data).toMatchObject({
            ...OTHER_STAFF,
            attendances: {
                [MEETING.meetingId]: StaffAttendanceTypeEnum.EXCUSED,
            },
        });
    });

    it("updates attendance successfully", async () => {
        const EXISTING_ATTENDANCES = {
            [MEETING.meetingId]: StaffAttendanceTypeEnum.PRESENT,
        };
        await SupabaseDB.STAFF.update({
            attendances: EXISTING_ATTENDANCES,
        })
            .eq("email", OTHER_STAFF.email)
            .single();

        const res = await postAsAdmin(
            `/staff/${OTHER_STAFF.email}/attendance`
        ).send({
            meetingId: MEETING.meetingId,
            attendanceType: StaffAttendanceTypeEnum.EXCUSED,
        });

        expect(res.status).toBe(StatusCodes.OK);

        const updated = await SupabaseDB.STAFF.select()
            .eq("email", OTHER_STAFF.email)
            .single();
        expect(updated.data).toMatchObject({
            ...OTHER_STAFF,
            attendances: new Map([
                ...Object.entries(EXISTING_ATTENDANCES),
                [MEETING.meetingId, StaffAttendanceTypeEnum.EXCUSED],
            ]),
        });
    });
});
