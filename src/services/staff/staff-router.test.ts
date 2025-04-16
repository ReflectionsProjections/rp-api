import { beforeEach, describe, expect, it } from "@jest/globals";
import { get, getAsStaff, getAsAdmin } from "../../../testing/testingTools";
import { z } from "zod";

import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import { StaffValidator } from "./staff-schema";

type StaffType = z.infer<typeof StaffValidator>;

const TEST_STAFF = {
    userId: "userTest123",
    name: "Test Staff User 123",
    team: "dev",
    attendances: {}
} satisfies StaffType;

const EXPECTED_TEST_STAFF_RESPONSE = {
    userId: TEST_STAFF.userId,
    name: TEST_STAFF.name,
    team: TEST_STAFF.team,
    attendances: {},
}

const OTHER_STAFF = {
    userId: "userOther456",
    name: "Other Staff User 456",
    team: "content",
    attendances: {
        "meeting001": "present",
    }
} satisfies StaffType;

const EXPECTED_OTHER_STAFF_RESPONSE = {
    userId: OTHER_STAFF.userId,
    name: OTHER_STAFF.name,
    team: OTHER_STAFF.team,
    attendances: OTHER_STAFF.attendances,
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
    ])("should return all staff records for $description:", async ({getter}) => {
       const response = await getter("/staff/").expect(StatusCodes.OK);

       // Response should be an array of staff members where one of the users is our test user
       expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining(EXPECTED_TEST_STAFF_RESPONSE),
                expect.objectContaining(EXPECTED_OTHER_STAFF_RESPONSE)
            ])
       )
    });

    it("should return an unauthorized error for an unauthenticated user", async() => {
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
    ])("should return correct staff data for $description requesting existing user", async ({ getter }) => {
        const response = await getter(`/staff/${TEST_STAFF.userId}`).expect(StatusCodes.OK);
        expect(response.body).toMatchObject(EXPECTED_TEST_STAFF_RESPONSE); 
    });

    it("should return an unauthorized error for an unauthenticated user", async() => {
        await get(`/staff/${TEST_STAFF.userId}`).expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return not found for a non-existent user", async() => {
        const response = await getAsAdmin(`/staff/${NON_EXISTENT_USERID}`).expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ "error": "UserNotFound" });
    });
})