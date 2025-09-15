import { beforeEach, describe, expect, it } from "@jest/globals";
import {
    getAsStaff,
    getAsAdmin,
    postAsStaff,
    postAsAdmin,
    delAsAdmin,
    TESTER,
    patchAsAdmin,
} from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import { CommitteeNames } from "../meetings/meetings-schema";
import { Staff } from "../staff/staff-schema";
import { v4 as uuidv4 } from "uuid";

const TEST_SHIFT = {
    shiftId: uuidv4(),
    name: "Test Shift",
    role: "CHECK_IN" as const,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour later
    location: "Main Atrium",
};

const TESTER_STAFF = {
    email: TESTER.email,
    name: TESTER.displayName,
    team: CommitteeNames.Enum.DEV,
    attendances: {},
} satisfies Staff;

const OTHER_STAFF = {
    email: "other_staff@test.com",
    name: "other-staff",
    team: CommitteeNames.Enum.DEV,
    attendances: {},
} satisfies Staff;

beforeEach(async () => {
    await SupabaseDB.STAFF.insert(TESTER_STAFF);
    await SupabaseDB.STAFF.insert(OTHER_STAFF);
});

describe("Shift Management (/shifts)", () => {
    describe("POST /shifts", () => {
        it("should allow an admin to create a new shift", async () => {
            const response = await postAsAdmin("/shifts")
                .send(TEST_SHIFT)
                .expect(StatusCodes.CREATED);

            expect(response.body).toMatchObject({
                role: TEST_SHIFT.role,
                location: TEST_SHIFT.location,
            });

            const { data } = await SupabaseDB.SHIFTS.select()
                .eq("shiftId", response.body.shiftId)
                .single();
            expect(data?.role).toBe(TEST_SHIFT.role);
        });

        it("should forbid a non-admin from creating a shift", async () => {
            await postAsStaff("/shifts")
                .send(TEST_SHIFT)
                .expect(StatusCodes.FORBIDDEN);
        });
    });

    describe("GET /shifts", () => {
        it("should return a list of all shifts to an admin", async () => {
            await SupabaseDB.SHIFTS.insert(TEST_SHIFT);
            const response = await getAsAdmin("/shifts").expect(StatusCodes.OK);
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: TEST_SHIFT.name }),
                ])
            );
        });
    });

    describe("PATCH /shifts/:shiftId", () => {
        it("should allow an admin to update a shift", async () => {
            await SupabaseDB.SHIFTS.insert(TEST_SHIFT);
            const updatePayload = { location: "Second Floor" };

            const response = await patchAsAdmin(`/shifts/${TEST_SHIFT.shiftId}`)
                .send(updatePayload)
                .expect(StatusCodes.OK);

            expect(response.body.location).toBe("Second Floor");
        });
    });

    describe("DELETE /shifts/:shiftId", () => {
        it("should allow an admin to delete a shift", async () => {
            await SupabaseDB.SHIFTS.insert(TEST_SHIFT);
            await delAsAdmin(`/shifts/${TEST_SHIFT.shiftId}`).expect(
                StatusCodes.NO_CONTENT
            );

            const { data } = await SupabaseDB.SHIFTS.select()
                .eq("shiftId", TEST_SHIFT.shiftId)
                .single();
            expect(data).toBeNull();
        });
    });
});

describe("Shift Assignment Management", () => {
    let testShiftId: string;

    beforeEach(async () => {
        // Create a shift and an assignment for these tests
        const { data: shift } = await SupabaseDB.SHIFTS.insert(TEST_SHIFT)
            .select()
            .single()
            .throwOnError();
        testShiftId = shift!.shiftId;

        await SupabaseDB.SHIFT_ASSIGNMENTS.insert({
            shiftId: testShiftId,
            staffEmail: OTHER_STAFF.email,
        })
            .select()
            .single()
            .throwOnError();
    });

    describe("POST /shifts/:shiftId/assignments", () => {
        it("should allow an admin to assign a staff member to a shift", async () => {
            const response = await postAsAdmin(
                `/shifts/${testShiftId}/assignments`
            )
                .send({ staffEmail: TESTER_STAFF.email })
                .expect(StatusCodes.CREATED);

            expect(response.body.staffEmail).toBe(TESTER_STAFF.email);
            expect(response.body.shiftId).toBe(testShiftId);
        });
    });

    describe("DELETE /shifts/:shiftId/assignments", () => {
        it("should allow an admin to remove a staff assignment", async () => {
            await delAsAdmin(`/shifts/${testShiftId}/assignments`)
                .send({ staffEmail: OTHER_STAFF.email })
                .expect(StatusCodes.NO_CONTENT);

            const { data } = await SupabaseDB.SHIFT_ASSIGNMENTS.select()
                .match({
                    shiftId: testShiftId,
                    staffEmail: OTHER_STAFF.email,
                })
                .maybeSingle();

            expect(data).toBeNull();
        });
    });
});

describe("Staff-Facing Shift Routes", () => {
    let testShiftId: string;

    beforeEach(async () => {
        const { data: shift } = await SupabaseDB.SHIFTS.insert(TEST_SHIFT)
            .select()
            .single()
            .throwOnError();
        testShiftId = shift!.shiftId;
        await SupabaseDB.SHIFT_ASSIGNMENTS.insert({
            shiftId: testShiftId,
            staffEmail: TESTER_STAFF.email,
        }).throwOnError();
    });

    describe("GET /shifts/my-shifts", () => {
        it("should return only the shifts assigned to the logged-in staff member", async () => {
            const response = await getAsStaff("/shifts/my-shifts").expect(
                StatusCodes.OK
            );
            expect(response.body.length).toBe(1);
            expect(response.body[0].staffEmail).toBe(TESTER_STAFF.email);
            expect(response.body[0].shifts.name).toBe(TEST_SHIFT.name);
        });
    });

    describe("GET /shifts/assignments", () => {
        it("should return the roster for a given shift", async () => {
            const response = await getAsStaff(`/shifts/assignments`).expect(
                StatusCodes.OK
            );
            expect(response.body.length).toBe(1);
            expect(response.body[0].staff.email).toBe(TESTER_STAFF.email);
        });
    });

    describe("POST /shifts/:shiftId/acknowledge", () => {
        it("should allow a staff member to acknowledge their own shift (toggle from false to true)", async () => {
            // Initially acknowledged should be false (default)
            const { data: initialAssignment } =
                await SupabaseDB.SHIFT_ASSIGNMENTS.select()
                    .match({
                        shiftId: testShiftId,
                        staffEmail: TESTER_STAFF.email,
                    })
                    .single();
            expect(initialAssignment?.acknowledged).toBe(false);

            const response = await postAsStaff(
                `/shifts/${testShiftId}/acknowledge`
            )
                .send({})
                .expect(StatusCodes.OK);

            expect(response.body.acknowledged).toBe(true);
            expect(response.body.staffEmail).toBe(TESTER_STAFF.email);
            expect(response.body.shiftId).toBe(testShiftId);

            // Verify in database
            const { data } = await SupabaseDB.SHIFT_ASSIGNMENTS.select()
                .match({
                    shiftId: testShiftId,
                    staffEmail: TESTER_STAFF.email,
                })
                .single();
            expect(data?.acknowledged).toBe(true);
        });

        it("should allow a staff member to unacknowledge their own shift (toggle from true to false)", async () => {
            // First acknowledge the shift
            await postAsStaff(`/shifts/${testShiftId}/acknowledge`)
                .send({})
                .expect(StatusCodes.OK);

            // Then toggle it back to unacknowledged
            const response = await postAsStaff(
                `/shifts/${testShiftId}/acknowledge`
            )
                .send({})
                .expect(StatusCodes.OK);

            expect(response.body.acknowledged).toBe(false);
            expect(response.body.staffEmail).toBe(TESTER_STAFF.email);
            expect(response.body.shiftId).toBe(testShiftId);

            // Verify in database
            const { data } = await SupabaseDB.SHIFT_ASSIGNMENTS.select()
                .match({
                    shiftId: testShiftId,
                    staffEmail: TESTER_STAFF.email,
                })
                .single();
            expect(data?.acknowledged).toBe(false);
        });

        it("should forbid a staff member from acknowledging a shift they are not assigned to", async () => {
            // Create another shift and assign OTHER_STAFF to it
            const otherShift = {
                ...TEST_SHIFT,
                shiftId: uuidv4(),
                name: "Other Shift",
            };
            await SupabaseDB.SHIFTS.insert(otherShift);
            await SupabaseDB.SHIFT_ASSIGNMENTS.insert({
                shiftId: otherShift.shiftId,
                staffEmail: OTHER_STAFF.email,
            });

            // Try to acknowledge a shift that TESTER is not assigned to
            await postAsStaff(`/shifts/${otherShift.shiftId}/acknowledge`)
                .send({})
                .expect(StatusCodes.NOT_FOUND);
        });

        it("should forbid a non-staff user from acknowledging shifts", async () => {
            await postAsAdmin(`/shifts/${testShiftId}/acknowledge`)
                .send({})
                .expect(StatusCodes.FORBIDDEN);
        });

        it("should return 404 for non-existent shift", async () => {
            const nonExistentShiftId = uuidv4();
            await postAsStaff(`/shifts/${nonExistentShiftId}/acknowledge`)
                .send({})
                .expect(StatusCodes.NOT_FOUND);
        });
    });
});
