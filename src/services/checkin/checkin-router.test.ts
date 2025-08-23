import { beforeEach, describe, expect, it } from "@jest/globals";
import { post, postAsStaff, postAsAdmin } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import {
    CheckinEventPayload,
    ScanPayload,
    MerchScanPayload,
} from "./checkin-schema";
import { EventType } from "../events/events-schema";
import { generateQrHash, getCurrentDay } from "./checkin-utils";
import { DayKey } from "../attendee/attendee-schema";
import { v4 as uuidv4 } from "uuid";
import { Role } from "../auth/auth-models";

const NOW_SECONDS = Math.floor(Date.now() / 1000);
const ONE_HOUR_SECONDS = 3600;

const dummyUUID = "00000000-0000-0000-0000-000000000000";
const TEST_ATTENDEE_1 = {
    userId: "attendee001",
    points: 0,
    puzzlesCompleted: [],
};

const GENERAL_CHECKIN_EVENT = {
    eventId: uuidv4(),
    name: "Main Event Check-In",
    startTime: new Date(
        (NOW_SECONDS - ONE_HOUR_SECONDS * 2) * 1000
    ).toISOString(),
    endTime: new Date(
        (NOW_SECONDS + ONE_HOUR_SECONDS * 8) * 1000
    ).toISOString(),
    points: 100,
    description: "Main event check-in point.",
    isVirtual: false,
    imageUrl: null,
    location: "Siebel 1st Floor",
    eventType: EventType.enum.CHECKIN,
    isVisible: true,
    attendanceCount: 0,
};

const REGULAR_EVENT_FOR_CHECKIN = {
    eventId: uuidv4(),
    name: "Google Deepmind Guest Speaker Event",
    startTime: new Date((NOW_SECONDS - 600) * 1000).toISOString(),
    endTime: new Date((NOW_SECONDS + ONE_HOUR_SECONDS) * 1000).toISOString(),
    points: 50,
    description: "A guest speaker event.",
    isVirtual: false,
    imageUrl: null,
    location: "Siebel 2405",
    eventType: EventType.enum.SPEAKER,
    isVisible: true,
    attendanceCount: 0,
};

const MEALS_EVENT = {
    eventId: uuidv4(),
    name: "Lunch Time",
    startTime: new Date((NOW_SECONDS - 300) * 1000).toISOString(),
    endTime: new Date((NOW_SECONDS + ONE_HOUR_SECONDS) * 1000).toISOString(),
    points: 10,
    description: "Time to eat",
    isVirtual: false,
    imageUrl: null,
    location: "Siebel Second Floor Atrium",
    eventType: EventType.enum.MEALS,
    isVisible: true,
    attendanceCount: 0,
};

let VALID_QR_CODE_TEST_ATTENDEE_1: string;
let EXPIRED_QR_CODE_TEST_ATTENDEE_1: string;
const INVALID_SIGNATURE_QR_CODE = "tamperedHash#1234567890#attendee001";
const MALFORMED_QR_CODE = "just_one_part";
const NON_EXISTENT_eventId = "eventDoesNotExist404";
const NON_EXISTENT_ATTENDEE_ID = "attendeeDoesNotExist404";

type InsertTestAttendeeOverrides = {
    userId?: string;
    email?: string;
    points?: number;
    puzzlesCompleted?: string[];
    [key: string]: unknown;
};

async function insertTestAttendee(overrides: InsertTestAttendeeOverrides = {}) {
    const userId = overrides.userId || "attendee001";
    const email = overrides.email || "attendee001@test.com";

    await SupabaseDB.AUTH_ROLES.delete().eq("userId", userId).throwOnError();
    await SupabaseDB.AUTH_INFO.delete().eq("userId", userId).throwOnError();
    await SupabaseDB.AUTH_INFO.insert([
        {
            userId: userId,
            displayName: "Attendee 001",
            email,
            authId: "null",
        },
    ]).throwOnError();

    await SupabaseDB.AUTH_ROLES.insert([
        {
            userId: userId,
            role: Role.enum.USER,
        },
    ]).throwOnError();

    await SupabaseDB.REGISTRATIONS.insert([
        {
            userId: userId,
            name: "Attendee 001",
            email,
            school: "UIUC",
            educationLevel: "BS",
            isInterestedMechMania: false,
            isInterestedPuzzleBang: true,
            allergies: [],
            dietaryRestrictions: [],
            ethnicity: [],
            gender: "prefer not say",
            graduationYear: "2027",
        },
    ]).throwOnError();

    await SupabaseDB.ATTENDEES.insert([
        {
            userId: userId,
            tags: ["testtag1", "testtag2"],
            points: 0,
            puzzlesCompleted: [],
            currentTier: 'TIER1',
            icon: 'RED',
            hasPriorityFri: false,
            hasPriorityMon: false,
            hasPrioritySat: false,
            hasPrioritySun: false,
            hasPriorityThu: false,
            hasPriorityTue: false,
            hasPriorityWed: false,
            favoriteEvents: [],
            ...overrides,
        },
    ]).throwOnError();
}

beforeEach(async () => {
    await SupabaseDB.EVENT_ATTENDANCES.delete().neq(
        "attendee",
        "NON_EXISTENT_ATTENDEE_ID"
    );
    await SupabaseDB.ATTENDEE_ATTENDANCES.delete().neq("userId", dummyUUID);
    await SupabaseDB.ATTENDEES.delete().neq("userId", dummyUUID);
    await SupabaseDB.REGISTRATIONS.delete().neq("userId", dummyUUID);
    await SupabaseDB.AUTH_ROLES.delete().eq("userId", dummyUUID);
    await SupabaseDB.AUTH_INFO.delete().eq("userId", dummyUUID);
    await SupabaseDB.EVENTS.delete().neq("eventId", dummyUUID);
    await insertTestAttendee();
    const validExpTime = NOW_SECONDS + ONE_HOUR_SECONDS;
    const expiredExpTime = NOW_SECONDS - ONE_HOUR_SECONDS;

    VALID_QR_CODE_TEST_ATTENDEE_1 = generateQrHash(
        TEST_ATTENDEE_1.userId,
        validExpTime
    );
    EXPIRED_QR_CODE_TEST_ATTENDEE_1 = generateQrHash(
        TEST_ATTENDEE_1.userId,
        expiredExpTime
    );
    await SupabaseDB.EVENTS.insert([
        REGULAR_EVENT_FOR_CHECKIN,
        GENERAL_CHECKIN_EVENT,
        MEALS_EVENT,
    ]);
});

afterAll(async () => {
    await SupabaseDB.EVENT_ATTENDANCES.delete().neq("attendee", "");
    await SupabaseDB.ATTENDEE_ATTENDANCES.delete().neq("userId", "");
    await SupabaseDB.EVENTS.delete().eq(
        "eventId",
        REGULAR_EVENT_FOR_CHECKIN.eventId
    );
    await SupabaseDB.EVENTS.delete().eq(
        "eventId",
        GENERAL_CHECKIN_EVENT.eventId
    );
    await SupabaseDB.EVENTS.delete().eq("eventId", MEALS_EVENT.eventId);
    await SupabaseDB.ATTENDEES.delete().neq("userId", "");
    await SupabaseDB.REGISTRATIONS.delete().neq("userId", "");
    await SupabaseDB.AUTH_ROLES.delete().eq("userId", "non-existent-user");
    await SupabaseDB.AUTH_INFO.delete().eq("userId", "non-existent-user");
});

describe("POST /checkin/scan/staff", () => {
    let payload: ScanPayload;
    let currentDay: DayKey;

    beforeEach(async () => {
        // Clean only the dynamic tables
        // await SupabaseDB.EVENT_ATTENDANCES.delete().neq("attendee", "");
        // await SupabaseDB.ATTENDEE_ATTENDANCES.delete().neq("userId", "");

        // Reset events attendanceCount back to 0
        for (const event of [
            REGULAR_EVENT_FOR_CHECKIN,
            GENERAL_CHECKIN_EVENT,
            MEALS_EVENT,
        ]) {
            await SupabaseDB.EVENTS.update({ attendanceCount: 0 }).eq(
                "eventId",
                event.eventId
            );
        }

        // Reset attendee fields
        await SupabaseDB.ATTENDEES.update({
            points: 0,
            hasPriorityMon: false,
            hasPriorityTue: false,
            hasPriorityWed: false,
            hasPriorityThu: false,
            hasPriorityFri: false,
            hasPrioritySat: false,
            hasPrioritySun: false,
        }).eq("userId", TEST_ATTENDEE_1.userId);

        payload = {
            eventId: REGULAR_EVENT_FOR_CHECKIN.eventId,
            qrCode: VALID_QR_CODE_TEST_ATTENDEE_1,
        };

        currentDay = getCurrentDay();
    });

    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
    }, 50000);

    it.each([
        {
            description: "missing eventId",
            payload: { qrCode: VALID_QR_CODE_TEST_ATTENDEE_1 },
        },
        {
            description: "missing qrCode",
            payload: { eventId: REGULAR_EVENT_FOR_CHECKIN.eventId },
        },
        {
            description: "eventId is not a string",
            payload: { eventId: 123, qrCode: VALID_QR_CODE_TEST_ATTENDEE_1 },
        },
        {
            description: "qrCode is not a string",
            payload: {
                eventId: REGULAR_EVENT_FOR_CHECKIN.eventId,
                qrCode: true,
            },
        },
    ])(
        "should return BAD_REQUEST when $description",
        async ({ payload: invalidData }) => {
            await postAsAdmin("/checkin/scan/staff")
                .send(invalidData)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );

    it("should return UNAUTHORIZED if QR code has expired", async () => {
        payload.qrCode = EXPIRED_QR_CODE_TEST_ATTENDEE_1;
        const response = await postAsStaff("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);

        expect(response.body).toEqual({ error: "QR code has expired" });
    });

    it("should return INTERNAL_SERVER_ERROR for a malformed QR code", async () => {
        payload.qrCode = MALFORMED_QR_CODE;
        await postAsStaff("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR for a QR code with an invalid signature", async () => {
        payload.qrCode = INVALID_SIGNATURE_QR_CODE;
        await postAsStaff("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR if eventId does not exist", async () => {
        payload.eventId = "nonExistentEvent123";
        await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR if userId from QR code does not exist in Attendee collection", async () => {
        const nonExistentuserId = "userNotInDB123";
        payload.qrCode = generateQrHash(
            nonExistentuserId,
            NOW_SECONDS + ONE_HOUR_SECONDS
        );

        await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return FORBIDDEN if attendee is already checked into the event", async () => {
        await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.OK);

        const response = await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.FORBIDDEN);

        expect(response.body).toEqual({ error: "IsDuplicate" });
    });

    it("should successfully check-in user to a REGULAR event and update records", async () => {
        payload.eventId = REGULAR_EVENT_FOR_CHECKIN.eventId;
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;

        const response = await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const { data: eventAttn, error: eventAttnError } =
            await SupabaseDB.EVENT_ATTENDANCES.select()
                .eq("eventId", payload.eventId)
                .eq("attendee", TEST_ATTENDEE_1.userId)
                .single();
        expect(eventAttnError).toBeNull();
        expect(eventAttn).not.toBeNull();

        const { data: attendeeAttn, error: attendeeAttnError } =
            await SupabaseDB.ATTENDEE_ATTENDANCES.select(
                "userId, eventsAttended"
            )
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.eventsAttended).toContain(payload.eventId);
        }

        const { data: updatedEventData, error: eventError } =
            await SupabaseDB.EVENTS.select("attendanceCount")
                .eq("eventId", payload.eventId)
                .single();
        expect(eventError).toBeNull();
        expect(updatedEventData?.attendanceCount).toBe(
            REGULAR_EVENT_FOR_CHECKIN.attendanceCount + 1
        );

        const { data: updatedAttendee, error: attendeeError } =
            await SupabaseDB.ATTENDEES.select()
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeError).toBeNull();
        expect(updatedAttendee).toMatchObject({
            points: TEST_ATTENDEE_1.points + REGULAR_EVENT_FOR_CHECKIN.points,
            [`hasPriority${currentDay}`]: true,
        });
    }, 100000);

    it("should successfully check-in user to a CHECKIN type event and update records", async () => {
        payload.eventId = GENERAL_CHECKIN_EVENT.eventId;
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;

        const response = await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        // Verify a record was created in the 'event_attendance' junction table
        const { data: eventAttn, error: eventAttnError } =
            await SupabaseDB.EVENT_ATTENDANCES.select()
                .eq("eventId", payload.eventId)
                .eq("attendee", TEST_ATTENDEE_1.userId)
                .single();
        expect(eventAttnError).toBeNull();
        expect(eventAttn).not.toBeNull();

        // Verify a record was created in the 'attendee_attendance' junction table
        const { data: attendeeAttn, error: attendeeAttnError } =
            await SupabaseDB.ATTENDEE_ATTENDANCES.select(
                "userId, eventsAttended"
            )
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.eventsAttended).toContain(payload.eventId);
        }

        // Verify the event's attendance count was incremented
        const { data: updatedEvent, error: eventError } =
            await SupabaseDB.EVENTS.select("attendanceCount")
                .eq("eventId", payload.eventId)
                .single();
        expect(eventError).toBeNull();
        expect(updatedEvent?.attendanceCount).toBe(
            GENERAL_CHECKIN_EVENT.attendanceCount + 1
        );

        // Verify the attendee was updated correctly for a CHECKIN event
        const { data: updatedAttendee, error: attendeeError } =
            await SupabaseDB.ATTENDEES.select()
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeError).toBeNull();
        expect(updatedAttendee).toMatchObject({
            points: TEST_ATTENDEE_1.points + GENERAL_CHECKIN_EVENT.points,
            [`hasPriority${currentDay}`]: false,
        });
    });

    it("should successfully check-in user to a MEALS type event and update records", async () => {
        payload.eventId = MEALS_EVENT.eventId;
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;

        const response = await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        // Verify a record was created in the 'event_attendance' junction table
        const { data: eventAttn, error: eventAttnError } =
            await SupabaseDB.EVENT_ATTENDANCES.select()
                .eq("eventId", payload.eventId)
                .eq("attendee", TEST_ATTENDEE_1.userId)
                .single();
        expect(eventAttnError).toBeNull();
        expect(eventAttn).not.toBeNull();

        // Verify a record was created in the 'attendee_attendance' junction table
        const { data: attendeeAttn, error: attendeeAttnError } =
            await SupabaseDB.ATTENDEE_ATTENDANCES.select(
                "userId, eventsAttended"
            )
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.eventsAttended).toContain(payload.eventId);
        }
        // Verify the event's attendance count was incremented
        const { data: updatedEvent, error: eventError } =
            await SupabaseDB.EVENTS.select("attendanceCount")
                .eq("eventId", payload.eventId)
                .single();
        expect(eventError).toBeNull();
        expect(updatedEvent?.attendanceCount).toBe(
            MEALS_EVENT.attendanceCount + 1
        );

        // Verify the attendee was updated correctly for a MEALS event
        const { data: updatedAttendee, error: attendeeError } =
            await SupabaseDB.ATTENDEES.select()
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeError).toBeNull();
        expect(updatedAttendee).toMatchObject({
            points: TEST_ATTENDEE_1.points + MEALS_EVENT.points,
            [`hasPriority${currentDay}`]: false,
        });
    });
});

describe("POST /checkin/event", () => {
    let payload: CheckinEventPayload;
    let currentDay: DayKey;

    beforeEach(async () => {
        payload = {
            eventId: REGULAR_EVENT_FOR_CHECKIN.eventId,
            userId: TEST_ATTENDEE_1.userId,
        };
        currentDay = getCurrentDay();
    });

    beforeEach(async () => {
        // Clear junction tables
        await SupabaseDB.EVENT_ATTENDANCES.delete().neq("attendee", "");
        await SupabaseDB.ATTENDEE_ATTENDANCES.delete().neq("userId", "");

        // Reset attendance count on all static events
        for (const event of [
            REGULAR_EVENT_FOR_CHECKIN,
            GENERAL_CHECKIN_EVENT,
            MEALS_EVENT,
        ]) {
            await SupabaseDB.EVENTS.update({ attendanceCount: 0 }).eq(
                "eventId",
                event.eventId
            );
        }

        // Reset static test attendee
        await SupabaseDB.ATTENDEES.update({
            points: 0,
            hasPriorityMon: false,
            hasPriorityTue: false,
            hasPriorityWed: false,
            hasPriorityThu: false,
            hasPriorityFri: false,
            hasPrioritySat: false,
            hasPrioritySun: false,
        }).eq("userId", TEST_ATTENDEE_1.userId);
    });

    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/checkin/event")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
    }, 30000);

    it.each([
        {
            description: "missing eventId",
            payload: { userId: TEST_ATTENDEE_1.userId },
        },
        {
            description: "missing userId",
            payload: { eventId: REGULAR_EVENT_FOR_CHECKIN.eventId },
        },
        {
            description: "eventId is not a string",
            payload: { eventId: 12345, userId: TEST_ATTENDEE_1.userId },
        },
        {
            description: "userId is not a string",
            payload: {
                eventId: REGULAR_EVENT_FOR_CHECKIN.eventId,
                userId: true,
            },
        },
        {
            description: "eventId is an empty string",
            payload: { eventId: "", userId: TEST_ATTENDEE_1.userId },
        },
        {
            description: "userId is an empty string",
            payload: {
                eventId: REGULAR_EVENT_FOR_CHECKIN.eventId,
                userId: "",
            },
        },
    ])(
        "should return BAD_REQUEST when $description for an admin user",
        async ({ payload: invalidData }) => {
            await postAsAdmin("/checkin/event")
                .send(invalidData)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );

    it("should successfully check-in to a regular event and update all records", async () => {
        payload.eventId = REGULAR_EVENT_FOR_CHECKIN.eventId;
        payload.userId = TEST_ATTENDEE_1.userId;

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const { data: eventAttn } = await SupabaseDB.EVENT_ATTENDANCES.select()
            .eq("eventId", payload.eventId)
            .eq("attendee", payload.userId)
            .single();
        expect(eventAttn).not.toBeNull();

        const { data: attendeeAttn, error: attendeeAttnError } =
            await SupabaseDB.ATTENDEE_ATTENDANCES.select(
                "userId, eventsAttended"
            )
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.eventsAttended).toContain(payload.eventId);
        }

        // Verify event counter was incremented
        const { data: updatedEvent } = await SupabaseDB.EVENTS.select(
            "attendanceCount"
        )
            .eq("eventId", payload.eventId)
            .single();
        expect(updatedEvent?.attendanceCount).toBe(
            REGULAR_EVENT_FOR_CHECKIN.attendanceCount + 1
        );

        // Verify attendee was updated for a regular event
        const { data: updatedAttendee } = await SupabaseDB.ATTENDEES.select()
            .eq("userId", payload.userId)
            .single();
        expect(updatedAttendee).toMatchObject({
            points: TEST_ATTENDEE_1.points + REGULAR_EVENT_FOR_CHECKIN.points,
            [`hasPriority${currentDay}`]: true,
        });
    });

    it("should successfully check-in to a check in event and update records", async () => {
        payload.eventId = GENERAL_CHECKIN_EVENT.eventId;

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const { data: eventAttn } = await SupabaseDB.EVENT_ATTENDANCES.select()
            .eq("eventId", payload.eventId)
            .eq("attendee", payload.userId)
            .single();
        expect(eventAttn).not.toBeNull();

        const { data: attendeeAttn, error: attendeeAttnError } =
            await SupabaseDB.ATTENDEE_ATTENDANCES.select(
                "userId, eventsAttended"
            )
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.eventsAttended).toContain(payload.eventId);
        }

        // Verify event counter
        const { data: updatedEvent } = await SupabaseDB.EVENTS.select(
            "attendanceCount"
        )
            .eq("eventId", payload.eventId)
            .single();
        expect(updatedEvent?.attendanceCount).toBe(
            GENERAL_CHECKIN_EVENT.attendanceCount + 1
        );

        // Verify attendee was updated for a CHECKIN event
        const { data: updatedAttendee } = await SupabaseDB.ATTENDEES.select()
            .eq("userId", payload.userId)
            .single();
        expect(updatedAttendee).toMatchObject({
            points: TEST_ATTENDEE_1.points + GENERAL_CHECKIN_EVENT.points,
            [`hasPriority${currentDay}`]: false,
        });
    });

    it("should successfully check-in to a meals event and update records", async () => {
        payload.eventId = MEALS_EVENT.eventId;

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const { data: eventAttn } = await SupabaseDB.EVENT_ATTENDANCES.select()
            .eq("eventId", payload.eventId)
            .eq("attendee", payload.userId)
            .single();
        expect(eventAttn).not.toBeNull();

        const { data: attendeeAttn, error: attendeeAttnError } =
            await SupabaseDB.ATTENDEE_ATTENDANCES.select(
                "userId, eventsAttended"
            )
                .eq("userId", TEST_ATTENDEE_1.userId)
                .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.eventsAttended).toContain(payload.eventId);
        }
        // Verify event counter
        const { data: updatedEvent } = await SupabaseDB.EVENTS.select(
            "attendanceCount"
        )
            .eq("eventId", payload.eventId)
            .single();
        expect(updatedEvent?.attendanceCount).toBe(
            MEALS_EVENT.attendanceCount + 1
        );

        // Verify attendee was updated for a MEALS event
        const { data: updatedAttendee } = await SupabaseDB.ATTENDEES.select()
            .eq("userId", payload.userId)
            .single();
        expect(updatedAttendee).toMatchObject({
            points: TEST_ATTENDEE_1.points + MEALS_EVENT.points,
            [`hasPriority${currentDay}`]: false,
        });
    });

    it("should correctly add points when $role checks in attendee who already has points", async () => {
        const preExistingPoints = 25;
        await SupabaseDB.ATTENDEES.update({ points: preExistingPoints }).eq(
            "userId",
            TEST_ATTENDEE_1.userId
        );

        payload.eventId = REGULAR_EVENT_FOR_CHECKIN.eventId;

        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);

        const { data: updatedAttendee } = await SupabaseDB.ATTENDEES.select(
            "points"
        )
            .eq("userId", TEST_ATTENDEE_1.userId)
            .single();
        expect(updatedAttendee?.points).toBe(
            preExistingPoints + REGULAR_EVENT_FOR_CHECKIN.points
        );
    });

    it("should return FORBIDDEN if attempting to check-in an attendee that has already checked into the event", async () => {
        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.FORBIDDEN);
        expect(response.body).toEqual({ error: "IsDuplicate" });
    });

    it("should return INTERNAL_SERVER_ERROR if eventId does not exist", async () => {
        payload.eventId = NON_EXISTENT_eventId;
        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR if userId does not exist", async () => {
        payload.userId = NON_EXISTENT_ATTENDEE_ID;
        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should not make partial updates if check-in fails due to non-existent event", async () => {
        payload.eventId = "eventDoesNotExist404";

        const { data: attendeeBefore } = await SupabaseDB.ATTENDEES.select()
            .eq("userId", TEST_ATTENDEE_1.userId)
            .single();
        const { count: attendanceCountBefore } =
            await SupabaseDB.EVENT_ATTENDANCES.select("*", {
                count: "exact",
                head: true,
            }).eq("attendee", TEST_ATTENDEE_1.userId);

        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);

        const { data: attendeeAfter } = await SupabaseDB.ATTENDEES.select()
            .eq("userId", TEST_ATTENDEE_1.userId)
            .single();
        const { count: attendanceCountAfter } =
            await SupabaseDB.EVENT_ATTENDANCES.select("*", {
                count: "exact",
                head: true,
            }).eq("attendee", TEST_ATTENDEE_1.userId);

        expect(attendeeAfter).toEqual(attendeeBefore);
        expect(attendanceCountAfter).toBe(attendanceCountBefore);
    });
});

describe("POST /checkin/scan/merch", () => {
    let payload: MerchScanPayload;

    const QR_CODE_NON_EXISTENT_USER = generateQrHash(
        "nonExistentUserForMerch",
        NOW_SECONDS + ONE_HOUR_SECONDS
    );

    beforeEach(() => {
        payload = {
            qrCode: VALID_QR_CODE_TEST_ATTENDEE_1,
        };
    });

    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it.each([
        { description: "missing qrCode field", payload: {} },
        { description: "qrCode is not a string", payload: { qrCode: 12345 } },
        { description: "qrCode is an empty string", payload: { qrCode: "" } },
    ])(
        "should return BAD_REQUEST when $description",
        async ({ payload: invalidData }) => {
            await postAsAdmin("/checkin/scan/merch")
                .send(invalidData)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );

    it("should return UNAUTHORIZED if QR code has expired", async () => {
        payload.qrCode = EXPIRED_QR_CODE_TEST_ATTENDEE_1;
        const response = await postAsStaff("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
        expect(response.body).toEqual({ error: "QR code has expired" });
    });

    it("should return INTERNAL_SERVER_ERROR for a malformed QR code", async () => {
        payload.qrCode = MALFORMED_QR_CODE;
        await postAsStaff("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR for a QR code with an invalid signature", async () => {
        payload.qrCode = INVALID_SIGNATURE_QR_CODE;
        await postAsStaff("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should successfully validate a valid QR code and return userId", async () => {
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;
        const response = await postAsAdmin("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);
    });

    it("should successfully validate a valid QR code for a user not in the Attendee collection and return their userId", async () => {
        payload.qrCode = QR_CODE_NON_EXISTENT_USER;
        const response = await postAsAdmin("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe("nonExistentUserForMerch");
        const { data: nonExistentAttendee } =
            await SupabaseDB.ATTENDEES.select()
                .eq("userId", "nonExistentUserForMerch")
                .maybeSingle();
        expect(nonExistentAttendee).toBeNull();
    });

    it("should pass if QR code is valid and expires in 1 second", async () => {
        const mockCurrentTime = NOW_SECONDS;
        const expiryTime = mockCurrentTime + 1;
        const qrCodeAboutToExpire = generateQrHash(
            TEST_ATTENDEE_1.userId,
            expiryTime
        );
        payload.qrCode = qrCodeAboutToExpire;

        jest.spyOn(Date, "now").mockImplementation(
            () => mockCurrentTime * 1000
        );

        const response = await postAsStaff("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        jest.spyOn(Date, "now").mockRestore();
    });

    it("should fail if QR code is valid but expired 1 second ago", async () => {
        const mockCurrentTime = NOW_SECONDS;
        const expiryTime = mockCurrentTime - 1;
        const qrCodeJustExpired = generateQrHash(
            TEST_ATTENDEE_1.userId,
            expiryTime
        );
        payload.qrCode = qrCodeJustExpired;

        jest.spyOn(Date, "now").mockImplementation(
            () => mockCurrentTime * 1000
        );

        const response = await postAsStaff("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
        expect(response.body).toEqual({ error: "QR code has expired" });

        jest.spyOn(Date, "now").mockRestore();
    });
});
