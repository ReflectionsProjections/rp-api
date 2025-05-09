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
import { Database } from "../../database";
import Config from "../../config";
import { CommitteeNames, Meeting } from "../meetings/meetings-schema";
import { Staff, StaffAttendanceTypeEnum, StaffValidator } from "./staff-schema";

const TESTER_STAFF = {
    userId: TESTER.userId,
    name: TESTER.displayName,
    team: CommitteeNames.Enum.DEV,
    attendances: {},
} satisfies Staff;

const MEETING = {
    meetingId: "meeting-abc123",
    committeeType: "DEV",
    startTime: new Date(),
} satisfies Meeting;

const OTHER_STAFF = {
    userId: "other-staff-user123",
    name: "other-staff",
    team: CommitteeNames.Enum.DEV,
    attendances: {},
} satisfies Staff;

const NEW_STAFF_VALID = {
    userId: "userNew789",
    name: "New Staff User 789",
    team: "marketing",
    attendances: {},
} satisfies Staff;

const NON_EXISTENT_USERID = "nonExistentUser789";

beforeEach(async () => {
    await Database.MEETINGS.create(MEETING);
    await Database.STAFF.create(StaffValidator.parse(TESTER_STAFF));
    await Database.STAFF.create(StaffValidator.parse(OTHER_STAFF));
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
        }
    );

    it("should return an unauthorized error for an unauthenticated user", async () => {
        await get("/staff/").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return an empty array if no staff records exist", async () => {
        await Database.STAFF.deleteMany({});
        const response = await getAsAdmin("/staff/").expect(StatusCodes.OK);
        expect(response.body).toEqual([]);
    });
});

describe("GET /staff/:USERID", () => {
    it.each([
        { role: "ADMIN", description: "an ADMIN user", getter: getAsAdmin },
        { role: "STAFF", description: "a STAFF user", getter: getAsStaff },
    ])(
        "should return correct staff data for $description requesting existing user",
        async ({ getter }) => {
            const response = await getter(
                `/staff/${TESTER_STAFF.userId}`
            ).expect(StatusCodes.OK);
            expect(response.body).toMatchObject(TESTER_STAFF);
        }
    );

    it("should return an unauthorized error for an unauthenticated user", async () => {
        await get(`/staff/${TESTER_STAFF.userId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return not found for a non-existent user", async () => {
        const response = await getAsAdmin(
            `/staff/${NON_EXISTENT_USERID}`
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

        const createdStaff = await Database.STAFF.findOne({
            userId: NEW_STAFF_VALID.userId,
        });
        expect(createdStaff?.toObject()).toMatchObject(NEW_STAFF_VALID);
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
                userId: NEW_STAFF_VALID.userId,
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
        const createdStaff = await Database.STAFF.findOne({
            userId: NEW_STAFF_VALID.userId,
        });
        expect(createdStaff?.toObject()).toMatchObject(NEW_STAFF_VALID);
    });

    // conflict request test
    it("should return BAD_REQUEST when userId already exists", async () => {
        const response = await postAsAdmin("/staff/")
            .send(TESTER_STAFF)
            .expect(StatusCodes.BAD_REQUEST);
        expect(response.body).toEqual({ error: "UserAlreadyExists" });
    });
});

describe("DELETE /staff/:USERID", () => {
    // success case
    it("should delete existing staff member and return NO_CONTENT", async () => {
        await delAsAdmin(`/staff/${TESTER_STAFF.userId}`).expect(
            StatusCodes.NO_CONTENT
        );
        const deletedStaff = await Database.STAFF.findOne({
            userId: TESTER_STAFF.userId,
        });
        expect(deletedStaff).toBeNull();
    });

    // auth tests
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await del(`/staff/${TESTER_STAFF.userId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return FORBIDDEN for STAFF user", async () => {
        await delAsStaff(`/staff/${TESTER_STAFF.userId}`).expect(
            StatusCodes.FORBIDDEN
        );
    });

    // not found test
    it("should return NOT_FOUND when trying to delete a staff member that doesn't exist", async () => {
        const response = await delAsAdmin(
            `/staff/${NON_EXISTENT_USERID}`
        ).expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "UserNotFound" });
    });
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
