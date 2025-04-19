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
} from "../../../testing/testingTools";
import { z } from "zod";

import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import { StaffValidator } from "./staff-schema";

type StaffType = z.infer<typeof StaffValidator>;

const TEST_STAFF = {
    userId: "userTest123",
    name: "Test Staff User 123",
    team: "dev",
    attendances: {},
} satisfies StaffType;

const EXPECTED_TEST_STAFF_RESPONSE = {
    userId: TEST_STAFF.userId,
    name: TEST_STAFF.name,
    team: TEST_STAFF.team,
    attendances: {},
};

const OTHER_STAFF = {
    userId: "userOther456",
    name: "Other Staff User 456",
    team: "content",
    attendances: {
        meeting001: "present",
    },
} satisfies StaffType;

const EXPECTED_OTHER_STAFF_RESPONSE = {
    userId: OTHER_STAFF.userId,
    name: OTHER_STAFF.name,
    team: OTHER_STAFF.team,
    attendances: OTHER_STAFF.attendances,
};

const NEW_STAFF_VALID = {
    userId: "userNew789",
    name: "New Staff User 789",
    team: "marketing",
} satisfies StaffType;

const EXPECTED_NEW_STAFF_RESPONSE = {
    userId: NEW_STAFF_VALID.userId,
    name: NEW_STAFF_VALID.name,
    team: NEW_STAFF_VALID.team,
    attendances: {},
};

const NON_EXISTENT_USERID = "nonExistentUser789";

beforeEach(async () => {
    await Database.STAFF.create(TEST_STAFF);
    await Database.STAFF.create(OTHER_STAFF);
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
                    expect.objectContaining(EXPECTED_TEST_STAFF_RESPONSE),
                    expect.objectContaining(EXPECTED_OTHER_STAFF_RESPONSE),
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
            const response = await getter(`/staff/${TEST_STAFF.userId}`).expect(
                StatusCodes.OK
            );
            expect(response.body).toMatchObject(EXPECTED_TEST_STAFF_RESPONSE);
        }
    );

    it("should return an unauthorized error for an unauthenticated user", async () => {
        await get(`/staff/${TEST_STAFF.userId}`).expect(
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
        expect(response.body).toMatchObject(EXPECTED_NEW_STAFF_RESPONSE);

        const createdStaff = await Database.STAFF.findOne({
            userId: NEW_STAFF_VALID.userId,
        });
        expect(createdStaff?.toObject()).toMatchObject(
            EXPECTED_NEW_STAFF_RESPONSE
        );
    });

    // auth tests
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/staff/")
            .send(NEW_STAFF_VALID)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    // need to fix ADMIN and STAFF roles for this to work LOL
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
        expect(createdStaff?.toObject()).toMatchObject(
            EXPECTED_NEW_STAFF_RESPONSE
        );
    });

    // conflict request test
    it("should return BAD_REQUEST when userId already exists", async () => {
        const response = await postAsAdmin("/staff/")
            .send(TEST_STAFF)
            .expect(StatusCodes.BAD_REQUEST);
        expect(response.body).toEqual({ error: "UserAlreadyExists" });
    });
});

describe("DELETE /staff/:USERID", () => {
    // success case
    it("should delete existing staff member and return NO_CONTENT", async () => {
        await delAsAdmin(`/staff/${TEST_STAFF.userId}`).expect(
            StatusCodes.NO_CONTENT
        );
        const deletedStaff = await Database.STAFF.findOne({
            userId: TEST_STAFF.userId,
        });
        expect(deletedStaff).toBeNull();
    });

    // auth tests
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await del(`/staff/${TEST_STAFF.userId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    // need to fix ADMIN and STAFF roles for this to work LOL
    it("should return FORBIDDEN for STAFF user", async () => {
        await delAsStaff(`/staff/${TEST_STAFF.userId}`).expect(
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
