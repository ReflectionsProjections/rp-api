import { beforeEach, describe, expect, it } from "@jest/globals";
import { post, postAsStaff, postAsAdmin } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import {
    CheckinEventPayload,
    ScanPayload,
    MerchScanPayload,
} from "./checkin-schema";
import { EventType, InternalEvent } from "../events/events-schema";
import { generateQrHash, getCurrentDay } from "./checkin-utils";
import { AttendeeType } from "../attendee/attendee-validators";
import { DayKey } from "../attendee/attendee-schema";

const NOW_SECONDS = Math.floor(Date.now() / 1000);
const ONE_HOUR_SECONDS = 1 * 60 * 60;

const TEST_ATTENDEE_1 = {
    userId: "attendee001",
    name: "Test Attendee One",
    email: "attendee1@illinois.edu",
    dietaryRestrictions: [],
    allergies: [],
} satisfies AttendeeType;

const GENERAL_CHECKIN_EVENT = {
    eventId: "generalCheckinEvent123",
    name: "Main Event Check-In",
    startTime: new Date((NOW_SECONDS - ONE_HOUR_SECONDS * 2) * 1000),
    endTime: new Date((NOW_SECONDS + ONE_HOUR_SECONDS * 8) * 1000),
    points: 100,
    description: "Main event check-in point.",
    isVirtual: false,
    imageUrl: null,
    location: "Siebel 1st Floor",
    eventType: EventType.enum.CHECKIN,
    isVisible: true,
    attendanceCount: 0,
} satisfies InternalEvent;

const REGULAR_EVENT_FOR_CHECKIN = {
    eventId: "regularEvent456",
    name: "Google Deepmind Guest Speaker Event",
    startTime: new Date((NOW_SECONDS - 10 * 60) * 1000),
    endTime: new Date((NOW_SECONDS + ONE_HOUR_SECONDS) * 1000),
    points: 50,
    description: "A guest speaker event.",
    isVirtual: false,
    imageUrl: null,
    location: "Siebel 2405",
    eventType: EventType.enum.SPEAKER,
    isVisible: true,
    attendanceCount: 0,
} satisfies InternalEvent;

const MEALS_EVENT = {
    eventId: "mealsEvent789",
    name: "Lunch Time",
    startTime: new Date((NOW_SECONDS - 5 * 60) * 1000),
    endTime: new Date((NOW_SECONDS + ONE_HOUR_SECONDS) * 1000),
    points: 10,
    description: "Time to eat",
    isVirtual: false,
    imageUrl: null,
    location: "Siebel Second Floor Atrium",
    eventType: EventType.enum.MEALS,
    isVisible: true,
    attendanceCount: 0,
} satisfies InternalEvent;

let VALID_QR_CODE_TEST_ATTENDEE_1: string;
let EXPIRED_QR_CODE_TEST_ATTENDEE_1: string;
const INVALID_SIGNATURE_QR_CODE = "tamperedHash#1234567890#attendee001";
const MALFORMED_QR_CODE = "just_one_part";
const NON_EXISTENT_EVENT_ID = "eventDoesNotExist404";
const NON_EXISTENT_ATTENDEE_ID = "attendeeDoesNotExist404";

beforeEach(async () => {
    await Database.ATTENDEE.create(TEST_ATTENDEE_1);
    await Database.EVENTS.create(GENERAL_CHECKIN_EVENT);
    await Database.EVENTS.create(REGULAR_EVENT_FOR_CHECKIN);
    await Database.EVENTS.create(MEALS_EVENT);

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
});

describe("POST /checkin/scan/staff", () => {
    let payload: ScanPayload;
    let currentDay: DayKey;

    beforeEach(() => {
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
    });

    const invalidBodyPayloads = [
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
            payload: { eventId: REGULAR_EVENT_FOR_CHECKIN, qrCode: true },
        },
    ];

    it.each(invalidBodyPayloads)(
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
        const nonExistentUserId = "userNotInDB123";
        payload.qrCode = generateQrHash(
            nonExistentUserId,
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

        const eventAttendance = await Database.EVENTS_ATTENDANCE.findOne({
            eventId: payload.eventId,
        });
        expect(eventAttendance?.attendees).toContain(TEST_ATTENDEE_1.userId);

        const attendeeAttendance = await Database.ATTENDEE_ATTENDANCE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(attendeeAttendance?.eventsAttended).toContain(payload.eventId);

        const updatedEvent = await Database.EVENTS.findOne({
            eventId: payload.eventId,
        });
        expect(updatedEvent?.attendanceCount).toBe(
            REGULAR_EVENT_FOR_CHECKIN.attendanceCount + 1
        );

        const updatedAttendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(updatedAttendee?.points).toBe(REGULAR_EVENT_FOR_CHECKIN.points);
        expect(updatedAttendee?.hasCheckedIn).toBe(false);

        expect(updatedAttendee?.hasPriority?.[currentDay]).toBe(true);
    });

    it("should successfully check-in user to a CHECKIN type event and update records", async () => {
        payload.eventId = GENERAL_CHECKIN_EVENT.eventId;
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;

        const response = await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const eventAttendance = await Database.EVENTS_ATTENDANCE.findOne({
            eventId: payload.eventId,
        });
        expect(eventAttendance?.attendees).toContain(TEST_ATTENDEE_1.userId);

        const attendeeAttendance = await Database.ATTENDEE_ATTENDANCE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(attendeeAttendance?.eventsAttended).toContain(payload.eventId);

        const updatedEvent = await Database.EVENTS.findOne({
            eventId: payload.eventId,
        });
        expect(updatedEvent?.attendanceCount).toBe(
            GENERAL_CHECKIN_EVENT.attendanceCount + 1
        );

        const updatedAttendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(updatedAttendee?.points).toBe(GENERAL_CHECKIN_EVENT.points);
        expect(updatedAttendee?.hasCheckedIn).toBe(true);
        expect(updatedAttendee?.hasPriority?.[currentDay]).toBe(false);
    });

    it("should successfully check-in user to a MEALS type event and update records", async () => {
        payload.eventId = MEALS_EVENT.eventId;
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;

        const response = await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const eventAttendance = await Database.EVENTS_ATTENDANCE.findOne({
            eventId: payload.eventId,
        });
        expect(eventAttendance?.attendees).toContain(TEST_ATTENDEE_1.userId);

        const attendeeAttendance = await Database.ATTENDEE_ATTENDANCE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(attendeeAttendance?.eventsAttended).toContain(payload.eventId);

        const updatedEvent = await Database.EVENTS.findOne({
            eventId: payload.eventId,
        });
        expect(updatedEvent?.attendanceCount).toBe(
            MEALS_EVENT.attendanceCount + 1
        );

        const updatedAttendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(updatedAttendee?.points).toBe(MEALS_EVENT.points);
        expect(updatedAttendee?.hasCheckedIn).toBe(false);
        expect(updatedAttendee?.hasPriority?.[currentDay]).toBe(false);
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

    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/checkin/event")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    const invalidEventApiPayloads = [
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
            payload: { eventId: REGULAR_EVENT_FOR_CHECKIN.eventId, userId: "" },
        },
    ];

    it.each(invalidEventApiPayloads)(
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

        const eventAttendance = await Database.EVENTS_ATTENDANCE.findOne({
            eventId: payload.eventId,
        });
        expect(eventAttendance?.attendees).toContain(TEST_ATTENDEE_1.userId);

        const attendeeAttendance = await Database.ATTENDEE_ATTENDANCE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(attendeeAttendance?.eventsAttended).toContain(payload.eventId);

        const updatedEvent = await Database.EVENTS.findOne({
            eventId: payload.eventId,
        });
        expect(updatedEvent?.attendanceCount).toBe(
            REGULAR_EVENT_FOR_CHECKIN.attendanceCount + 1
        );

        const updatedAttendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(updatedAttendee?.points).toBe(REGULAR_EVENT_FOR_CHECKIN.points);
        expect(updatedAttendee?.hasCheckedIn).toBe(false);
        expect(updatedAttendee?.hasPriority?.[currentDay]).toBe(true);
    });

    it("should successfully check-in to a check in event and update records", async () => {
        payload.eventId = GENERAL_CHECKIN_EVENT.eventId;
        payload.userId = TEST_ATTENDEE_1.userId;

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const eventAttendance = await Database.EVENTS_ATTENDANCE.findOne({
            eventId: payload.eventId,
        });
        expect(eventAttendance?.attendees).toContain(TEST_ATTENDEE_1.userId);

        const attendeeAttendance = await Database.ATTENDEE_ATTENDANCE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(attendeeAttendance?.eventsAttended).toContain(payload.eventId);

        const updatedEvent = await Database.EVENTS.findOne({
            eventId: payload.eventId,
        });
        expect(updatedEvent?.attendanceCount).toBe(
            GENERAL_CHECKIN_EVENT.attendanceCount + 1
        );

        const updatedAttendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(updatedAttendee?.hasCheckedIn).toBe(true);
        expect(updatedAttendee?.points).toBe(GENERAL_CHECKIN_EVENT.points);
        expect(updatedAttendee?.hasPriority?.[currentDay]).toBe(false);
    });

    it("should successfully check-in to a meals event and update records", async () => {
        payload.eventId = MEALS_EVENT.eventId;
        payload.userId = TEST_ATTENDEE_1.userId;

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const eventAttendance = await Database.EVENTS_ATTENDANCE.findOne({
            eventId: payload.eventId,
        });
        expect(eventAttendance?.attendees).toContain(TEST_ATTENDEE_1.userId);

        const attendeeAttendance = await Database.ATTENDEE_ATTENDANCE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(attendeeAttendance?.eventsAttended).toContain(payload.eventId);

        const updatedEvent = await Database.EVENTS.findOne({
            eventId: payload.eventId,
        });
        expect(updatedEvent?.attendanceCount).toBe(
            MEALS_EVENT.attendanceCount + 1
        );

        const updatedAttendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(updatedAttendee?.hasCheckedIn).toBe(false);
        expect(updatedAttendee?.points).toBe(MEALS_EVENT.points);
        expect(updatedAttendee?.hasPriority?.[currentDay]).toBe(false);
    });

    it("should correctly add points when $role checks in attendee who already has points", async () => {
        const preExistingPoints = 25;
        await Database.ATTENDEE.updateOne(
            { userId: TEST_ATTENDEE_1.userId },
            { $set: { points: preExistingPoints } }
        );

        payload.eventId = REGULAR_EVENT_FOR_CHECKIN.eventId;
        payload.userId = TEST_ATTENDEE_1.userId;

        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);

        const updatedAttendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
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
        payload.eventId = NON_EXISTENT_EVENT_ID;
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
        payload.eventId = NON_EXISTENT_EVENT_ID;
        payload.userId = TEST_ATTENDEE_1.userId;

        const attendeeBefore = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        }).lean();
        const eventAttendanceBefore =
            await Database.EVENTS_ATTENDANCE.countDocuments({
                attendees: TEST_ATTENDEE_1.userId,
            });
        const attendeeEventListBefore =
            await Database.ATTENDEE_ATTENDANCE.findOne({
                userId: TEST_ATTENDEE_1.userId,
            });

        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);

        const attendeeAfter = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        }).lean();
        const eventAttendanceAfter =
            await Database.EVENTS_ATTENDANCE.countDocuments({
                attendees: TEST_ATTENDEE_1.userId,
            });
        const attendeeEventListAfter =
            await Database.ATTENDEE_ATTENDANCE.findOne({
                userId: TEST_ATTENDEE_1.userId,
            });

        expect(attendeeAfter?.points).toBe(attendeeBefore?.points);
        expect(attendeeAfter?.hasCheckedIn).toBe(attendeeBefore?.hasCheckedIn);
        expect(attendeeAfter?.hasPriority?.[currentDay]).toBe(
            attendeeBefore?.hasPriority?.[currentDay]
        );
        expect(eventAttendanceAfter).toBe(eventAttendanceBefore);
        expect(attendeeEventListAfter?.eventsAttended?.length ?? 0).toBe(
            attendeeEventListBefore?.eventsAttended?.length ?? 0
        );
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

    const invalidMerchScanPayloads = [
        { description: "missing qrCode field", payload: {} },
        { description: "qrCode is not a string", payload: { qrCode: 12345 } },
        { description: "qrCode is an empty string", payload: { qrCode: "" } },
    ];

    it.each(invalidMerchScanPayloads)(
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

        const nonExistentAttendee = await Database.ATTENDEE.findOne({
            userId: "nonExistentUserForMerch",
        });
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

describe("POST /checkin/", () => {
    let payload: ScanPayload;
    const QR_CODE_NON_EXISTENT_ATTENDEE = generateQrHash(
        NON_EXISTENT_ATTENDEE_ID,
        NOW_SECONDS + ONE_HOUR_SECONDS
    );

    beforeEach(async () => {
        payload = {
            eventId: "dummyEventIdForGeneralCheckin",
            qrCode: VALID_QR_CODE_TEST_ATTENDEE_1,
        };
    });

    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/checkin/").send(payload).expect(StatusCodes.UNAUTHORIZED);
    });

    const invalidGeneralCheckinPayloads = [
        { description: "missing qrCode", payload: { eventId: "dummyEvent" } },
        {
            description: "qrCode is not a string",
            payload: { eventId: "dummyEvent", qrCode: 123 },
        },
        {
            description: "qrCode is an empty string",
            payload: { eventId: "dummyEvent", qrCode: "" },
        },
    ];

    it.each(invalidGeneralCheckinPayloads)(
        "should return BAD_REQUEST when $description",
        async ({ payload: invalidData }) => {
            await postAsAdmin("/checkin/")
                .send(invalidData)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );

    it("should return UNAUTHORIZED if QR code has expired", async () => {
        payload.qrCode = EXPIRED_QR_CODE_TEST_ATTENDEE_1;
        const response = await postAsStaff("/checkin/")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
        expect(response.body).toEqual({ error: "QR code has expired" });
    });

    it("should return INTERNAL_SERVER_ERROR for a malformed QR code", async () => {
        payload.qrCode = MALFORMED_QR_CODE;
        await postAsStaff("/checkin/")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR for a QR code with an invalid signature", async () => {
        payload.qrCode = INVALID_SIGNATURE_QR_CODE;
        await postAsStaff("/checkin/")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return NOT_FOUND if userId from QR code does not exist in Attendee collection", async () => {
        payload.qrCode = QR_CODE_NON_EXISTENT_ATTENDEE;
        const response = await postAsAdmin("/checkin/")
            .send(payload)
            .expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "UserNotFound" });
    });

    it("should return BAD_REQUEST if attendee is already generally checked in", async () => {
        await Database.ATTENDEE.updateOne(
            { userId: TEST_ATTENDEE_1.userId },
            { $set: { hasCheckedIn: true } }
        );

        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;
        const response = await postAsAdmin("/checkin/")
            .send(payload)
            .expect(StatusCodes.BAD_REQUEST);
        expect(response.body).toEqual({ error: "AlreadyCheckedIn" });
    });

    it("should successfully perform general check-in, update records, and return userId", async () => {
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;

        const attendeeBefore = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        }).lean();
        expect(attendeeBefore?.hasCheckedIn).toBe(false);

        const response = await postAsAdmin("/checkin/")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);

        const attendeeAfter = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        }).lean();
        expect(attendeeAfter?.hasCheckedIn).toBe(true);
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

        const response = await postAsStaff("/checkin/")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.userId);
        const attendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(attendee?.hasCheckedIn).toBe(true);

        jest.spyOn(Date, "now").mockRestore();
    });

    it("should fail with UNAUTHORIZED if QR code is valid but expired 1 second ago", async () => {
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

        const response = await postAsAdmin("/checkin/")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
        expect(response.body).toEqual({ error: "QR code has expired" });
        const attendee = await Database.ATTENDEE.findOne({
            userId: TEST_ATTENDEE_1.userId,
        });
        expect(attendee?.hasCheckedIn).toBe(false);

        jest.spyOn(Date, "now").mockRestore();
    });
});
