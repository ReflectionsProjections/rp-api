import { beforeEach, describe, expect, it } from "@jest/globals";
import { post, postAsStaff, postAsAdmin } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";
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

const TEST_ATTENDEE_1 = {
  user_id: "attendee001",
  points: 0,
  has_checked_in: false,
  puzzles_completed: [],
};

const GENERAL_CHECKIN_EVENT = {
  event_id: uuidv4(),
  name: "Main Event Check-In",
  start_time: new Date((NOW_SECONDS - ONE_HOUR_SECONDS * 2) * 1000).toISOString(),
  end_time: new Date((NOW_SECONDS + ONE_HOUR_SECONDS * 8) * 1000).toISOString(),
  points: 100,
  description: "Main event check-in point.",
  is_virtual: false,
  image_url: null,
  location: "Siebel 1st Floor",
  event_type: EventType.enum.CHECKIN,
  is_visible: true,
  attendance_count: 0,
};

const REGULAR_EVENT_FOR_CHECKIN = {
  event_id: uuidv4(),
  name: "Google Deepmind Guest Speaker Event",
  start_time: new Date((NOW_SECONDS - 600) * 1000).toISOString(),
  end_time: new Date((NOW_SECONDS + ONE_HOUR_SECONDS) * 1000).toISOString(),
  points: 50,
  description: "A guest speaker event.",
  is_virtual: false,
  image_url: null,
  location: "Siebel 2405",
  event_type: EventType.enum.SPEAKER,
  is_visible: true,
  attendance_count: 0,
};

const MEALS_EVENT = {
  event_id: uuidv4(),
  name: "Lunch Time",
  start_time: new Date((NOW_SECONDS - 300) * 1000).toISOString(),
  end_time: new Date((NOW_SECONDS + ONE_HOUR_SECONDS) * 1000).toISOString(),
  points: 10,
  description: "Time to eat",
  is_virtual: false,
  image_url: null,
  location: "Siebel Second Floor Atrium",
  event_type: EventType.enum.MEALS,
  is_visible: true,
  attendance_count: 0,
};

let VALID_QR_CODE_TEST_ATTENDEE_1: string;
let EXPIRED_QR_CODE_TEST_ATTENDEE_1: string;
const INVALID_SIGNATURE_QR_CODE = "tamperedHash#1234567890#attendee001";
const MALFORMED_QR_CODE = "just_one_part";
const NON_EXISTENT_EVENT_ID = "eventDoesNotExist404";
const NON_EXISTENT_ATTENDEE_ID = "attendeeDoesNotExist404";

async function insertTestAttendee(overrides: { user_id?: string; email?: string; [key: string]: any } = {}) {
  const userId = overrides.user_id || "attendee001";
  const email = overrides.email || "attendee001@test.com";

  await SupabaseDB.ROLES.delete().eq("user_id", userId);
  await SupabaseDB.ROLES.insert([{
    user_id: userId,
    display_name: "Attendee 001",
    email,
    roles: [Role.enum.USER],
  }]);

  await SupabaseDB.REGISTRATIONS.insert([{
    user_id: userId,
    name: "Attendee 001",
    email,
    degree: "Bachelors",
    university: "UIUC",
    is_interested_mech_mania: false,
    is_interested_puzzle_bang: true,
    allergies: [],
    dietary_restrictions: [],
    ethnicity: null,
    gender: null,
  }]);

  await SupabaseDB.ATTENDEES.insert([{
    user_id: userId,
    points: 0,
    puzzles_completed: [],
    has_checked_in: false,
    has_priority_fri: false,
    has_priority_mon: false,
    has_priority_sat: false,
    has_priority_sun: false,
    has_priority_thu: false,
    has_priority_tue: false,
    has_priority_wed: false,
    has_redeemed_button: false,
    has_redeemed_cap: false,
    has_redeemed_tote: false,
    has_redeemed_tshirt: false,
    is_eligible_button: false,
    is_eligible_cap: false,
    is_eligible_tote: false,
    is_eligible_tshirt: false,
    favorite_events: [],
    ...overrides,
  }]);
}

beforeAll(async () => {
  await SupabaseDB.EVENT_ATTENDANCE.delete().neq("attendee", "");
await SupabaseDB.ATTENDEE_ATTENDANCE.delete().neq("user_id", "");
await SupabaseDB.EVENTS.delete().neq("event_id", "");
await SupabaseDB.ATTENDEES.delete().neq("user_id", "");
await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "");
await SupabaseDB.ROLES.delete().neq("user_id", "");
  await insertTestAttendee();
  const validExpTime = NOW_SECONDS + ONE_HOUR_SECONDS;
  const expiredExpTime = NOW_SECONDS - ONE_HOUR_SECONDS;

  VALID_QR_CODE_TEST_ATTENDEE_1 = generateQrHash(TEST_ATTENDEE_1.user_id, validExpTime);
  EXPIRED_QR_CODE_TEST_ATTENDEE_1 = generateQrHash(TEST_ATTENDEE_1.user_id, expiredExpTime);
  await SupabaseDB.EVENTS.insert([REGULAR_EVENT_FOR_CHECKIN, GENERAL_CHECKIN_EVENT, MEALS_EVENT]);
});


describe("POST /checkin/scan/staff", () => {
    let payload: ScanPayload;
    let currentDay: DayKey;

    beforeEach(async () => {
  // Clean only the dynamic tables
        await SupabaseDB.EVENT_ATTENDANCE.delete().neq("attendee", "");
        await SupabaseDB.ATTENDEE_ATTENDANCE.delete().neq("user_id", "");

        // Reset events attendance_count back to 0
        for (const event of [REGULAR_EVENT_FOR_CHECKIN, GENERAL_CHECKIN_EVENT, MEALS_EVENT]) {
            await SupabaseDB.EVENTS.update({ attendance_count: 0 }).eq("event_id", event.event_id);
        }

        // Reset attendee fields
        await SupabaseDB.ATTENDEES.update({
            points: 0,
            has_checked_in: false,
            has_priority_mon: false,
            has_priority_tue: false,
            has_priority_wed: false,
            has_priority_thu: false,
            has_priority_fri: false,
            has_priority_sat: false,
            has_priority_sun: false,
        }).eq("user_id", TEST_ATTENDEE_1.user_id);
        });

    
    
    beforeEach(() => {
        payload = {
            event_id: REGULAR_EVENT_FOR_CHECKIN.event_id,
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
            description: "missing event_id",
            payload: { qrCode: VALID_QR_CODE_TEST_ATTENDEE_1 },
        },
        {
            description: "missing qrCode",
            payload: { event_id: REGULAR_EVENT_FOR_CHECKIN.event_id },
        },
        {
            description: "event_id is not a string",
            payload: { event_id: 123, qrCode: VALID_QR_CODE_TEST_ATTENDEE_1 },
        },
        {
            description: "qrCode is not a string",
            payload: { event_id: REGULAR_EVENT_FOR_CHECKIN.event_id, qrCode: true },
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

    it("should return INTERNAL_SERVER_ERROR if event_id does not exist", async () => {
        payload.event_id = "nonExistentEvent123";
        await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR if user_id from QR code does not exist in Attendee collection", async () => {
        const nonExistentuser_id = "userNotInDB123";
        payload.qrCode = generateQrHash(
            nonExistentuser_id,
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
        payload.event_id = REGULAR_EVENT_FOR_CHECKIN.event_id;
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;
        const { data, error } = await SupabaseDB.EVENTS.select().eq("event_id", payload.event_id).single();
        console.log("Event before check-in:", data, error);
        const response = await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);

    const { data: eventAttn, error: eventAttnError } = await SupabaseDB.EVENT_ATTENDANCE
			.select()
			.eq("event_id", payload.event_id)
			.eq("attendee", TEST_ATTENDEE_1.user_id)
			.single();
		expect(eventAttnError).toBeNull();
		expect(eventAttn).not.toBeNull();

    const { data: attendeeAttn, error: attendeeAttnError } = await SupabaseDB.ATTENDEE_ATTENDANCE
        .select("user_id, events_attended")
        .eq("user_id", TEST_ATTENDEE_1.user_id)
        .single();
    expect(attendeeAttnError).toBeNull();
    expect(attendeeAttn).not.toBeNull();
    if (attendeeAttn) {
        expect(attendeeAttn.events_attended).toContain(payload.event_id);
    }

    
    const { data: updatedEventData, error: eventError } = await SupabaseDB.EVENTS
            .select("attendance_count")
            .eq("event_id", payload.event_id)
            .single();
        expect(eventError).toBeNull();
        expect(updatedEventData?.attendance_count).toBe(REGULAR_EVENT_FOR_CHECKIN.attendance_count + 1);

    	const { data: updatedAttendee, error: attendeeError } = await SupabaseDB.ATTENDEES
			.select()
			.eq("user_id", TEST_ATTENDEE_1.user_id)
			.single();
		expect(attendeeError).toBeNull();
		expect(updatedAttendee).toMatchObject({
			points: TEST_ATTENDEE_1.points + REGULAR_EVENT_FOR_CHECKIN.points,
			has_checked_in: false, // Not a general check-in event
			[`has_priority_${currentDay}`.toLowerCase()]: true,
		});
    }, 100000);

    it("should successfully check-in user to a CHECKIN type event and update records", async () => {
        payload.event_id = GENERAL_CHECKIN_EVENT.event_id;
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;

        const response = await postAsAdmin("/checkin/scan/staff")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);

        // Verify a record was created in the 'event_attendance' junction table
        const { data: eventAttn, error: eventAttnError } = await SupabaseDB.EVENT_ATTENDANCE
            .select()
            .eq("event_id", payload.event_id)
            .eq("attendee", TEST_ATTENDEE_1.user_id)
            .single();
        expect(eventAttnError).toBeNull();
        expect(eventAttn).not.toBeNull();

        // Verify a record was created in the 'attendee_attendance' junction table
        const { data: attendeeAttn, error: attendeeAttnError } = await SupabaseDB.ATTENDEE_ATTENDANCE
            .select("user_id, events_attended")
            .eq("user_id", TEST_ATTENDEE_1.user_id)
            .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.events_attended).toContain(payload.event_id);
        }

        // Verify the event's attendance count was incremented
        const { data: updatedEvent, error: eventError } = await SupabaseDB.EVENTS
            .select("attendance_count")
            .eq("event_id", payload.event_id)
            .single();
        expect(eventError).toBeNull();
        expect(updatedEvent?.attendance_count).toBe(GENERAL_CHECKIN_EVENT.attendance_count + 1);

        // Verify the attendee was updated correctly for a CHECKIN event
        const { data: updatedAttendee, error: attendeeError } = await SupabaseDB.ATTENDEES
            .select()
            .eq("user_id", TEST_ATTENDEE_1.user_id)
            .single();
        expect(attendeeError).toBeNull();
        expect(updatedAttendee).toMatchObject({
            points: TEST_ATTENDEE_1.points + GENERAL_CHECKIN_EVENT.points,
            has_checked_in: true, // Specific to CHECKIN event type
            [`has_priority_${currentDay}`.toLowerCase()]: false,
        });
    });

    it("should successfully check-in user to a MEALS type event and update records", async () => {
    payload.event_id = MEALS_EVENT.event_id;
    payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;

    const response = await postAsAdmin("/checkin/scan/staff")
        .send(payload)
        .expect(StatusCodes.OK);
    expect(response.body).toBe(TEST_ATTENDEE_1.user_id);

    // Verify a record was created in the 'event_attendance' junction table
    const { data: eventAttn, error: eventAttnError } = await SupabaseDB.EVENT_ATTENDANCE
        .select()
        .eq("event_id", payload.event_id)
        .eq("attendee", TEST_ATTENDEE_1.user_id)
        .single();
    expect(eventAttnError).toBeNull();
    expect(eventAttn).not.toBeNull();

    // Verify a record was created in the 'attendee_attendance' junction table
    const { data: attendeeAttn, error: attendeeAttnError } = await SupabaseDB.ATTENDEE_ATTENDANCE
        .select("user_id, events_attended")
        .eq("user_id", TEST_ATTENDEE_1.user_id)
        .single();
    expect(attendeeAttnError).toBeNull();
    expect(attendeeAttn).not.toBeNull();
    if (attendeeAttn) {
        expect(attendeeAttn.events_attended).toContain(payload.event_id);
    }
    // Verify the event's attendance count was incremented
    const { data: updatedEvent, error: eventError } = await SupabaseDB.EVENTS
        .select("attendance_count")
        .eq("event_id", payload.event_id)
        .single();
    expect(eventError).toBeNull();
    expect(updatedEvent?.attendance_count).toBe(MEALS_EVENT.attendance_count + 1);

    // Verify the attendee was updated correctly for a MEALS event
    const { data: updatedAttendee, error: attendeeError } = await SupabaseDB.ATTENDEES
        .select()
        .eq("user_id", TEST_ATTENDEE_1.user_id)
        .single();
    expect(attendeeError).toBeNull();
    expect(updatedAttendee).toMatchObject({
        points: TEST_ATTENDEE_1.points + MEALS_EVENT.points,
        has_checked_in: false, // Not changed for MEALS event
        [`has_priority_${currentDay}`.toLowerCase()]: false,
    });
});

});

describe("POST /checkin/event", () => {
    let payload: CheckinEventPayload;
    let currentDay: DayKey;

    beforeEach(async () => {
        payload = {
            event_id: REGULAR_EVENT_FOR_CHECKIN.event_id,
            user_id: TEST_ATTENDEE_1.user_id,
        };
        currentDay = getCurrentDay();
    });

    beforeEach(async () => {
    // Clear junction tables
        await SupabaseDB.EVENT_ATTENDANCE.delete().neq("attendee", "");
        await SupabaseDB.ATTENDEE_ATTENDANCE.delete().neq("user_id", "");

        // Reset attendance count on all static events
        for (const event of [REGULAR_EVENT_FOR_CHECKIN, GENERAL_CHECKIN_EVENT, MEALS_EVENT]) {
            await SupabaseDB.EVENTS.update({ attendance_count: 0 }).eq("event_id", event.event_id);
        }

        // Reset static test attendee
        await SupabaseDB.ATTENDEES.update({
            points: 0,
            has_checked_in: false,
            has_priority_mon: false,
            has_priority_tue: false,
            has_priority_wed: false,
            has_priority_thu: false,
            has_priority_fri: false,
            has_priority_sat: false,
            has_priority_sun: false,
        }).eq("user_id", TEST_ATTENDEE_1.user_id);
    });


    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/checkin/event")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
    }, 30000);

    it.each([
        {
            description: "missing event_id",
            payload: { user_id: TEST_ATTENDEE_1.user_id },
        },
        {
            description: "missing user_id",
            payload: { event_id: REGULAR_EVENT_FOR_CHECKIN.event_id },
        },
        {
            description: "event_id is not a string",
            payload: { event_id: 12345, user_id: TEST_ATTENDEE_1.user_id },
        },
        {
            description: "user_id is not a string",
            payload: {
                event_id: REGULAR_EVENT_FOR_CHECKIN.event_id,
                user_id: true,
            },
        },
        {
            description: "event_id is an empty string",
            payload: { event_id: "", user_id: TEST_ATTENDEE_1.user_id },
        },
        {
            description: "user_id is an empty string",
            payload: { event_id: REGULAR_EVENT_FOR_CHECKIN.event_id, user_id: "" },
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
        payload.event_id = REGULAR_EVENT_FOR_CHECKIN.event_id;
        payload.user_id = TEST_ATTENDEE_1.user_id;

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);

        const { data: eventAttn } = await SupabaseDB.EVENT_ATTENDANCE.select().eq("event_id", payload.event_id).eq("attendee", payload.user_id).single();
		expect(eventAttn).not.toBeNull();

		const { data: attendeeAttn, error: attendeeAttnError } = await SupabaseDB.ATTENDEE_ATTENDANCE
        .select("user_id, events_attended")
        .eq("user_id", TEST_ATTENDEE_1.user_id)
        .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.events_attended).toContain(payload.event_id);
        }

		// Verify event counter was incremented
		const { data: updatedEvent } = await SupabaseDB.EVENTS.select("attendance_count").eq("event_id", payload.event_id).single();
		expect(updatedEvent?.attendance_count).toBe(REGULAR_EVENT_FOR_CHECKIN.attendance_count + 1);

		// Verify attendee was updated for a regular event
		const { data: updatedAttendee } = await SupabaseDB.ATTENDEES.select().eq("user_id", payload.user_id).single();
		expect(updatedAttendee).toMatchObject({
			points: TEST_ATTENDEE_1.points + REGULAR_EVENT_FOR_CHECKIN.points,
			has_checked_in: false,
			[`has_priority_${currentDay}`.toLowerCase()]: true,
		});
    });

    it("should successfully check-in to a check in event and update records", async () => {
        payload.event_id = GENERAL_CHECKIN_EVENT.event_id;

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);

        const { data: eventAttn } = await SupabaseDB.EVENT_ATTENDANCE.select().eq("event_id", payload.event_id).eq("attendee", payload.user_id).single();
		expect(eventAttn).not.toBeNull();

        const { data: attendeeAttn, error: attendeeAttnError } = await SupabaseDB.ATTENDEE_ATTENDANCE
            .select("user_id, events_attended")
            .eq("user_id", TEST_ATTENDEE_1.user_id)
            .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.events_attended).toContain(payload.event_id);
        }

		// Verify event counter
		const { data: updatedEvent } = await SupabaseDB.EVENTS.select("attendance_count").eq("event_id", payload.event_id).single();
		expect(updatedEvent?.attendance_count).toBe(GENERAL_CHECKIN_EVENT.attendance_count + 1);

		// Verify attendee was updated for a CHECKIN event
		const { data: updatedAttendee } = await SupabaseDB.ATTENDEES.select().eq("user_id", payload.user_id).single();
		expect(updatedAttendee).toMatchObject({
			points: TEST_ATTENDEE_1.points + GENERAL_CHECKIN_EVENT.points,
			has_checked_in: true,
			[`has_priority_${currentDay}`.toLowerCase()]: false,
		});
    });

    it("should successfully check-in to a meals event and update records", async () => {
        payload.event_id = MEALS_EVENT.event_id;

        const response = await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);

        const { data: eventAttn } = await SupabaseDB.EVENT_ATTENDANCE.select().eq("event_id", payload.event_id).eq("attendee", payload.user_id).single();
		expect(eventAttn).not.toBeNull();
        
        const { data: attendeeAttn, error: attendeeAttnError } = await SupabaseDB.ATTENDEE_ATTENDANCE
            .select("user_id, events_attended")
            .eq("user_id", TEST_ATTENDEE_1.user_id)
            .single();
        expect(attendeeAttnError).toBeNull();
        expect(attendeeAttn).not.toBeNull();
        if (attendeeAttn) {
            expect(attendeeAttn.events_attended).toContain(payload.event_id);
        }
		// Verify event counter
		const { data: updatedEvent } = await SupabaseDB.EVENTS.select("attendance_count").eq("event_id", payload.event_id).single();
		expect(updatedEvent?.attendance_count).toBe(MEALS_EVENT.attendance_count + 1);
        
		// Verify attendee was updated for a MEALS event
		const { data: updatedAttendee } = await SupabaseDB.ATTENDEES.select().eq("user_id", payload.user_id).single();
		expect(updatedAttendee).toMatchObject({
			points: TEST_ATTENDEE_1.points + MEALS_EVENT.points,
			has_checked_in: false,
			[`has_priority_${currentDay}`.toLowerCase()]: false,
		});

    });

    it("should correctly add points when $role checks in attendee who already has points", async () => {
        const preExistingPoints = 25;
        await SupabaseDB.ATTENDEES.update({ points: preExistingPoints }).eq("user_id", TEST_ATTENDEE_1.user_id);

        payload.event_id = REGULAR_EVENT_FOR_CHECKIN.event_id;

        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.OK);

        const { data: updatedAttendee } = await SupabaseDB.ATTENDEES.select("points").eq("user_id", TEST_ATTENDEE_1.user_id).single();
		expect(updatedAttendee?.points).toBe(preExistingPoints + REGULAR_EVENT_FOR_CHECKIN.points);

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

    it("should return INTERNAL_SERVER_ERROR if event_id does not exist", async () => {
        payload.event_id = NON_EXISTENT_EVENT_ID;
        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR if user_id does not exist", async () => {
        payload.user_id = NON_EXISTENT_ATTENDEE_ID;
        await postAsAdmin("/checkin/event")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should not make partial updates if check-in fails due to non-existent event", async () => {
        payload.event_id = "eventDoesNotExist404";

        const { data: attendeeBefore } = await SupabaseDB.ATTENDEES.select().eq("user_id", TEST_ATTENDEE_1.user_id).single();
		const { count: attendanceCountBefore } = await SupabaseDB.EVENT_ATTENDANCE.select("*", { count: "exact", head: true }).eq("attendee", TEST_ATTENDEE_1.user_id);

		await postAsAdmin("/checkin/event")
			.send(payload)
			.expect(StatusCodes.INTERNAL_SERVER_ERROR);

		const { data: attendeeAfter } = await SupabaseDB.ATTENDEES.select().eq("user_id", TEST_ATTENDEE_1.user_id).single();
		const { count: attendanceCountAfter } = await SupabaseDB.EVENT_ATTENDANCE.select("*", { count: "exact", head: true }).eq("attendee", TEST_ATTENDEE_1.user_id);

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

    it("should successfully validate a valid QR code and return user_id", async () => {
        payload.qrCode = VALID_QR_CODE_TEST_ATTENDEE_1;
        const response = await postAsAdmin("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);
    });

    it("should successfully validate a valid QR code for a user not in the Attendee collection and return their user_id", async () => {
        payload.qrCode = QR_CODE_NON_EXISTENT_USER;
        const response = await postAsAdmin("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe("nonExistentUserForMerch");
        const { data: nonExistentAttendee } = await SupabaseDB.ATTENDEES.select().eq("user_id", "nonExistentUserForMerch").maybeSingle();
		expect(nonExistentAttendee).toBeNull();
    });

    it("should pass if QR code is valid and expires in 1 second", async () => {
        const mockCurrentTime = NOW_SECONDS;
        const expiryTime = mockCurrentTime + 1;
        const qrCodeAboutToExpire = generateQrHash(
            TEST_ATTENDEE_1.user_id,
            expiryTime
        );
        payload.qrCode = qrCodeAboutToExpire;

        jest.spyOn(Date, "now").mockImplementation(
            () => mockCurrentTime * 1000
        );

        const response = await postAsStaff("/checkin/scan/merch")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);

        jest.spyOn(Date, "now").mockRestore();
    });

    it("should fail if QR code is valid but expired 1 second ago", async () => {
        const mockCurrentTime = NOW_SECONDS;
        const expiryTime = mockCurrentTime - 1;
        const qrCodeJustExpired = generateQrHash(
            TEST_ATTENDEE_1.user_id,
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

    beforeEach(async () => {
        await SupabaseDB.ATTENDEES.update({
            points: 0,
            has_checked_in: false,
            has_priority_mon: false,
            has_priority_tue: false,
            has_priority_wed: false,
            has_priority_thu: false,
            has_priority_fri: false,
            has_priority_sat: false,
            has_priority_sun: false,
        }).eq("user_id", TEST_ATTENDEE_1.user_id);
    });

    const GENERAL_CHECKIN_EVENT_ID = "generalCheckinEvent";
    const QR_CODE_NON_EXISTENT_ATTENDEE = generateQrHash(
        NON_EXISTENT_ATTENDEE_ID,
        NOW_SECONDS + ONE_HOUR_SECONDS
    );

    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: VALID_QR_CODE_TEST_ATTENDEE_1,
        };
        await post("/checkin/").send(payload).expect(StatusCodes.UNAUTHORIZED);
    }, 50000);

    it.each([
        {
            description: "missing qrCode",
            payload: { event_id: GENERAL_CHECKIN_EVENT_ID },
        },
        {
            description: "qrCode is not a string",
            payload: { event_id: GENERAL_CHECKIN_EVENT_ID, qrCode: 123 },
        },
        {
            description: "qrCode is an empty string",
            payload: { event_id: GENERAL_CHECKIN_EVENT_ID, qrCode: "" },
        },
    ])(
        "should return BAD_REQUEST when $description",
        async ({ payload: invalidData }) => {
            await postAsAdmin("/checkin/")
                .send(invalidData)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );

    it("should return UNAUTHORIZED if QR code has expired", async () => {
        const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: EXPIRED_QR_CODE_TEST_ATTENDEE_1,
        };
        const response = await postAsStaff("/checkin/")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
        expect(response.body).toEqual({ error: "QR code has expired" });
    });

    it("should return INTERNAL_SERVER_ERROR for a malformed QR code", async () => {
        const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: MALFORMED_QR_CODE,
        };
        await postAsStaff("/checkin/")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return INTERNAL_SERVER_ERROR for a QR code with an invalid signature", async () => {
        const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: INVALID_SIGNATURE_QR_CODE,
        };
        await postAsStaff("/checkin/")
            .send(payload)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it("should return NOT_FOUND if user_id from QR code does not exist in Attendee collection", async () => {
        const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: QR_CODE_NON_EXISTENT_ATTENDEE,
        };
        const response = await postAsAdmin("/checkin/")
            .send(payload)
            .expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "UserNotFound" });
    });

    it("should return BAD_REQUEST if attendee is already generally checked in", async () => {
       	await SupabaseDB.ATTENDEES.update({ has_checked_in: true }).eq("user_id", TEST_ATTENDEE_1.user_id);
		const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: VALID_QR_CODE_TEST_ATTENDEE_1,
        };
		const response = await postAsAdmin("/checkin/").send(payload).expect(StatusCodes.BAD_REQUEST);
		expect(response.body).toEqual({ error: "AlreadyCheckedIn" });
    });

    it("should successfully perform general check-in, update records, and return user_id", async () => {
        const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: VALID_QR_CODE_TEST_ATTENDEE_1,
        };

        const { data: attendeeBefore } = await SupabaseDB.ATTENDEES.select().eq("user_id", TEST_ATTENDEE_1.user_id).maybeSingle();
        expect(attendeeBefore?.has_checked_in).toBe(false);

        const response = await postAsAdmin("/checkin/")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);

        const { data: attendeeAfter } = await SupabaseDB.ATTENDEES.select().eq("user_id", TEST_ATTENDEE_1.user_id).maybeSingle();
        expect(attendeeAfter?.has_checked_in).toBe(true);
    });

    it("should pass if QR code is valid and expires in 1 second", async () => {
        const mockCurrentTime = NOW_SECONDS;
        const expiryTime = mockCurrentTime + 1;
        const qrCodeAboutToExpire = generateQrHash(
            TEST_ATTENDEE_1.user_id,
            expiryTime
        );
        const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: qrCodeAboutToExpire,
        };

        jest.spyOn(Date, "now").mockImplementation(
            () => mockCurrentTime * 1000
        );

        const { data: attendeeBefore } = await SupabaseDB.ATTENDEES
            .select()
            .eq("user_id", TEST_ATTENDEE_1.user_id)
            .maybeSingle();
        expect(attendeeBefore?.has_checked_in).toBe(false);

        const response = await postAsStaff("/checkin/")
            .send(payload)
            .expect(StatusCodes.OK);
        expect(response.body).toBe(TEST_ATTENDEE_1.user_id);
        const { data: attendeeAfter } = await SupabaseDB.ATTENDEES.select().eq("user_id", TEST_ATTENDEE_1.user_id).maybeSingle();
        expect(attendeeAfter?.has_checked_in).toBe(true);

        jest.spyOn(Date, "now").mockRestore();
    });

    it("should fail with UNAUTHORIZED if QR code is valid but expired 1 second ago", async () => {
        const mockCurrentTime = NOW_SECONDS;
        const expiryTime = mockCurrentTime - 1;
        const qrCodeJustExpired = generateQrHash(
            TEST_ATTENDEE_1.user_id,
            expiryTime
        );
        const payload = {
            event_id: GENERAL_CHECKIN_EVENT_ID,
            qrCode: qrCodeJustExpired,
        };

        jest.spyOn(Date, "now").mockImplementation(
            () => mockCurrentTime * 1000
        );

        const response = await postAsAdmin("/checkin/")
            .send(payload)
            .expect(StatusCodes.UNAUTHORIZED);
        expect(response.body).toEqual({ error: "QR code has expired" });
        const { data: attendee } = await SupabaseDB.ATTENDEES.select().eq("user_id", TEST_ATTENDEE_1.user_id).maybeSingle();
        expect(attendee?.has_checked_in).toBe(false);

        jest.spyOn(Date, "now").mockRestore();
    });
});
