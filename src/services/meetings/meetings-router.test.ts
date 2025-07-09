import { beforeEach, describe, expect, it } from "@jest/globals";
import {
    get,
    getAsStaff,
    getAsAdmin,
    post,
    postAsStaff,
    postAsAdmin,
    put,
    putAsAdmin,
    putAsStaff,
    del,
    delAsStaff,
    delAsAdmin,
} from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { CommitteeTypes } from "../../supabase";
import { v4 as uuidv4 } from "uuid";
import { SupabaseDB } from "../../supabase";

const TEST_MEETING_1_ID = uuidv4();
const TEST_MEETING_2_ID = uuidv4();

const TEST_MEETING_1 = {
    meetingId: TEST_MEETING_1_ID,
    committeeType: CommitteeTypes.DEV,
    startTime: new Date(),
};

const EXPECTED_TEST_MEETING_1_RESPONSE = {
    meetingId: TEST_MEETING_1.meetingId,
    committeeType: TEST_MEETING_1.committeeType,
    startTime: TEST_MEETING_1.startTime.toISOString(),
};

const TEST_MEETING_2 = {
    meetingId: TEST_MEETING_2_ID,
    committeeType: CommitteeTypes.CONTENT,
    startTime: new Date(),
};

const EXPECTED_TEST_MEETING_2_RESPONSE = {
    meetingId: TEST_MEETING_2.meetingId,
    committeeType: TEST_MEETING_2.committeeType,
    startTime: TEST_MEETING_2.startTime.toISOString(),
};

const UNREAL_MEETING_ID = uuidv4();

// Runs these before running the tests
beforeEach(async () => {
    // Clear existing meetings
    await SupabaseDB.MEETINGS.delete().neq(
        "meeting_id",
        "00000000-0000-0000-0000-000000000000"
    );

    // Insert test meetings
    await SupabaseDB.MEETINGS.insert([
        {
            meeting_id: TEST_MEETING_1.meetingId,
            committee_type: TEST_MEETING_1.committeeType,
            start_time: TEST_MEETING_1.startTime,
        },
        {
            meeting_id: TEST_MEETING_2.meetingId,
            committee_type: TEST_MEETING_2.committeeType,
            start_time: TEST_MEETING_2.startTime,
        },
    ]);
});

describe("GET /meetings/", () => {
    it.each([
        { role: "ADMIN", description: "an ADMIN user", getter: getAsAdmin },
        { role: "STAFF", description: "a STAFF user", getter: getAsStaff },
    ])("should return all meetings for $description", async ({ getter }) => {
        const response = await getter("/meetings").expect(StatusCodes.OK);
        expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining(EXPECTED_TEST_MEETING_1_RESPONSE),
                expect.objectContaining(EXPECTED_TEST_MEETING_2_RESPONSE),
            ])
        );
    });

    it("should return unauthorized for unauthenticated user", async () => {
        await get("/meetings").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return empty array if no meetings exist", async () => {
        await SupabaseDB.MEETINGS.delete().neq(
            "meeting_id",
            "00000000-0000-0000-0000-000000000000"
        );
        const response = await getAsAdmin("/meetings").expect(StatusCodes.OK);
        expect(response.body).toEqual([]);
    });
});

describe("GET /meetings/:meetingId", () => {
    it.each([
        { role: "ADMIN", description: "an ADMIN user", getter: getAsAdmin },
        { role: "STAFF", description: "a STAFF user", getter: getAsStaff },
    ])(
        "should return correct specific meeting data for $description",
        async ({ getter }) => {
            const response = await getter(
                `/meetings/${TEST_MEETING_1.meetingId}`
            ).expect(StatusCodes.OK);
            expect(response.body).toMatchObject(
                EXPECTED_TEST_MEETING_1_RESPONSE
            );
        }
    );

    it("should return unauthorized for unauthenticated user", async () => {
        await get(`/meetings/${TEST_MEETING_1.meetingId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return not found if meeting doesn't exist", async () => {
        const response = await getAsAdmin(
            `/meetings/${UNREAL_MEETING_ID}`
        ).expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ message: "Meeting not found" });
    });
});

/*
Post test cases
1) Creating a meeting actually works - should be able to get the meeting after it goes in
2) What happens when the right parameters are not put into the endpoint
3) Making sure that unauthenticated and normal staff (not admin) members cannot create a meeting
*/

describe("POST /meetings/", () => {
    const newMeetingData = {
        committeeType: CommitteeTypes.DEV,
        startTime: new Date().toISOString(),
    };

    it("should create a new meeting for an admin user", async () => {
        const response = await postAsAdmin(`/meetings`)
            .send(newMeetingData)
            .expect(StatusCodes.CREATED);

        expect(response.body.committeeType).toBe(newMeetingData.committeeType);
        expect(new Date(response.body.startTime).toISOString()).toBe(
            newMeetingData.startTime
        );
        expect(response.body).toHaveProperty("meetingId");

        // Verify the meeting was actually created in the database
        const { data: result, error } = await SupabaseDB.MEETINGS.select("*")
            .eq("meeting_id", response.body.meetingId)
            .single();

        if (error) throw error;

        const dbMeeting = {
            meetingId: result.meeting_id,
            committeeType: result.committee_type,
            startTime: new Date(result.start_time).toISOString(),
        };

        expect(dbMeeting).toMatchObject(newMeetingData);
    });

    it("should return 400 if required fields are missing", async () => {
        const badData = {
            // no committee type!
            startTime: new Date().toISOString(),
        };

        const response = await postAsAdmin(`/meetings`)
            .send(badData)
            .expect(StatusCodes.BAD_REQUEST);

        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toBe("BadRequest");
        expect(response.body.details).toBeDefined();
    });

    it("should return 400 if invalid data is provided", async () => {
        const invalidData = {
            committeeType: "INVALID_COMMITTEE", // not one of allowed enums
            startTime: "not-a-valid-date",
        };

        const response = await postAsAdmin(`/meetings`)
            .send(invalidData)
            .expect(StatusCodes.BAD_REQUEST);

        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toBe("BadRequest");
        expect(response.body.details).toBeDefined();
    });

    it.each([
        {
            description: "an unauthenticated user",
            requester: () => post("/meetings"),
            expectedStatus: StatusCodes.UNAUTHORIZED,
        },
        {
            description: "a STAFF user",
            requester: () => postAsStaff("/meetings"),
            expectedStatus: StatusCodes.FORBIDDEN,
        },
    ])(
        "should not allow $description to create a meeting",
        async ({ requester, expectedStatus }) => {
            const response = await requester()
                .send(newMeetingData)
                .expect(expectedStatus);

            expect(response.body).toBeDefined();
        }
    );
});

/*
Put test cases
1) Editing a meeting actually works
2) Only admins can edit a meeting, anon and staff should not be able to
3) What happens if there is a bad request to the endpoint
4) What happens if you try to edit a meeting that isn't real
5) Does partial editing work
*/

describe("PUT /meetings/:meetingId", () => {
    it("should allow an admin to edit a meeting", async () => {
        const updatedData = {
            committeeType: CommitteeTypes.CORPORATE,
            startTime: new Date().toISOString(),
        };
        const response = await putAsAdmin(
            `/meetings/${TEST_MEETING_1.meetingId}`
        )
            .send(updatedData)
            .expect(StatusCodes.OK);
        expect(response.body.committeeType).toBe(updatedData.committeeType);
        expect(new Date(response.body.startTime).toISOString()).toBe(
            updatedData.startTime
        );
        expect(response.body.meetingId).toBe(TEST_MEETING_1.meetingId);
    });

    it.each([
        {
            description: "an unauthenticated user",
            requester: () => put(`/meetings/${TEST_MEETING_1.meetingId}`),
            expectedStatus: StatusCodes.UNAUTHORIZED,
        },
        {
            description: "a STAFF user",
            requester: () =>
                putAsStaff(`/meetings/${TEST_MEETING_1.meetingId}`),
            expectedStatus: StatusCodes.FORBIDDEN,
        },
    ])(
        "should not allow $description to edit a meeting",
        async ({ requester, expectedStatus }) => {
            const response = await requester()
                .send({
                    committeeType: CommitteeTypes.FULL_TEAM,
                    startTime: new Date().toISOString(),
                })
                .expect(expectedStatus);

            expect(response.body).toBeDefined();
        }
    );

    it("should return 400 Bad Request if payload is invalid", async () => {
        const invalidUpdate = {
            committeeType: "INVALID_COMMITTEE", // wrong enum
            startTime: "not-a-date",
        };

        await putAsAdmin(`/meetings/${TEST_MEETING_2.meetingId}`)
            .send(invalidUpdate)
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 404 Not Found if meeting does not exist", async () => {
        const updateData = {
            committeeType: CommitteeTypes.DESIGN,
            startTime: new Date().toISOString(),
        };

        await putAsAdmin(`/meetings/${UNREAL_MEETING_ID}`)
            .send(updateData)
            .expect(StatusCodes.NOT_FOUND);
    });

    it("should allow admins to edit just one field", async () => {
        const updateDataOneParam = {
            committeeType: CommitteeTypes.DESIGN,
        };

        const response = await putAsAdmin(
            `/meetings/${TEST_MEETING_2.meetingId}`
        )
            .send(updateDataOneParam)
            .expect(StatusCodes.OK);
        expect(response.body.committeeType).toBe(
            updateDataOneParam.committeeType
        );
        expect(response.body.meetingId).toBe(TEST_MEETING_2.meetingId);
        expect(new Date(response.body.startTime).toISOString()).toBe(
            new Date(TEST_MEETING_2.startTime).toISOString()
        );
    });
});

/*
DELETE test cases
1) Deleting a meeting actually works - no content should be received after successful deletion
2) Only admins can delete a meeting, anon and staff should not be able to
3) What happens if invalid meetingId; deleting a meeting that isn't real
 */

describe("DELETE /meetings/:meetingId", () => {
    it("should allow an admin to delete a meeting", async () => {
        await delAsAdmin(`/meetings/${TEST_MEETING_1.meetingId}`).expect(
            StatusCodes.NO_CONTENT
        );
        await getAsAdmin(`/meetings/${TEST_MEETING_1.meetingId}`).expect(
            StatusCodes.NOT_FOUND
        );
    });

    it.each([
        {
            description: "an unauthenticated user",
            requester: () => del(`/meetings/${TEST_MEETING_2.meetingId}`),
            expectedStatus: StatusCodes.UNAUTHORIZED,
        },
        {
            description: "a STAFF user",
            requester: () =>
                delAsStaff(`/meetings/${TEST_MEETING_2.meetingId}`),
            expectedStatus: StatusCodes.FORBIDDEN,
        },
    ])(
        "should not allow $description to delete a meeting",
        async ({ requester, expectedStatus }) => {
            await requester().expect(expectedStatus);
        }
    );

    it("should return 404 Not Found if meeting does not exist", async () => {
        await delAsAdmin(`/meetings/${UNREAL_MEETING_ID}`).expect(
            StatusCodes.NOT_FOUND
        );
    });
});
