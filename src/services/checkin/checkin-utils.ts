import { SupabaseDB } from "../../supabase";
import crypto from "crypto";
import { Config } from "../../config";
import { EventType } from "../events/events-schema";
import { DayKey } from "../attendee/attendee-schema";

export function getCurrentDay() {
    const currDate = new Date();
    const dayString = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
    }).format(currDate);
    return dayString as DayKey;
}

async function checkEventAndAttendeeExist(event_id: string, user_id: string) {
    const [eventRes, attendeeRes] = await Promise.all([
        SupabaseDB.EVENTS.select("event_id").eq("event_id", event_id).single(),
        SupabaseDB.ATTENDEES.select("user_id").eq("user_id", user_id).single(),
    ]);

    if (!eventRes.data || !attendeeRes.data) {
        throw new Error("Event or Attendee not found");
    }
}

async function checkForDuplicateAttendance(event_id: string, user_id: string) {
    const [isRepeatInEvent, isRepeatInAttendee] = await Promise.all([
        SupabaseDB.EVENT_ATTENDANCE.select()
            .eq("event_id", event_id)
            .eq("attendee", user_id)
            .maybeSingle(),
        SupabaseDB.ATTENDEE_ATTENDANCE.select()
            .eq("user_id", user_id)
            .contains("events_attended", [event_id])
            .maybeSingle(),
    ]);

    if (isRepeatInEvent.data || isRepeatInAttendee.data) {
        throw new Error("IsDuplicate");
    }
}

// Update attendee priority for the current day
async function updateAttendeePriority(user_id: string) {
    const day = getCurrentDay();
    await SupabaseDB.ATTENDEES.update({
        [`has_priority_${day}`.toLowerCase()]: true,
    })
        .eq("user_id", user_id)
        .throwOnError();
}

async function updateAttendanceRecords(event_id: string, user_id: string) {
    const { data: attendeeAttendance } =
        await SupabaseDB.ATTENDEE_ATTENDANCE.select("events_attended")
            .eq("user_id", user_id)
            .maybeSingle()
            .throwOnError();

    const eventsAttended = attendeeAttendance?.events_attended || [];

    if (!eventsAttended.includes(event_id)) {
        const newEventsAttended = [...eventsAttended, event_id];
        await SupabaseDB.ATTENDEE_ATTENDANCE.upsert({
            user_id: user_id,
            events_attended: newEventsAttended,
        }).throwOnError();
    }

    await SupabaseDB.EVENT_ATTENDANCE.insert({
        event_id: event_id,
        attendee: user_id,
    }).throwOnError();

    const { data: eventData } = await SupabaseDB.EVENTS.select(
        "attendance_count"
    )
        .eq("event_id", event_id)
        .single()
        .throwOnError();

    const currentCount = eventData?.attendance_count || 0;
    await SupabaseDB.EVENTS.update({ attendance_count: currentCount + 1 })
        .eq("event_id", event_id)
        .throwOnError();
}

async function assignPixelsToUser(user_id: string, pixels: number) {
    const { data: attendee } = await SupabaseDB.ATTENDEES.select("points")
        .eq("user_id", user_id)
        .single()
        .throwOnError();

    const new_points = (attendee?.points || 0) + pixels;

    const updatedFields = {
        points: new_points,
        is_eligible_cap: new_points >= 50,
        is_eligible_tote: new_points >= 35,
        is_eligible_button: new_points >= 20,
        is_eligible_tshirt: new_points >= 0,
    };

    await SupabaseDB.ATTENDEES.update(updatedFields)
        .eq("user_id", user_id)
        .throwOnError();
}

export async function checkInUserToEvent(event_id: string, user_id: string) {
    await checkEventAndAttendeeExist(event_id, user_id);
    await checkForDuplicateAttendance(event_id, user_id);

    const { data: event } = await SupabaseDB.EVENTS.select("event_type, points")
        .eq("event_id", event_id)
        .single()
        .throwOnError();

    if (
        event.event_type !== EventType.Enum.MEALS &&
        event.event_type !== EventType.Enum.CHECKIN
    ) {
        await updateAttendeePriority(user_id);
    }

    await updateAttendanceRecords(event_id, user_id);
    await assignPixelsToUser(user_id, event.points);
}

export function generateQrHash(user_id: string, expTime: number) {
    let hashStr = user_id + "#" + expTime;
    const hashIterations = Config.QR_HASH_ITERATIONS;
    const hashSecret = Config.QR_HASH_SECRET;

    const hmac = crypto.createHmac("sha256", hashSecret);
    hashStr = hmac.update(hashStr).digest("hex");

    for (let i = 0; i < hashIterations; i++) {
        const hash = crypto.createHash("sha256");
        hashStr = hash.update(hashSecret + "#" + hashStr).digest("hex");
    }

    return `${hashStr}#${expTime}#${user_id}`;
}

export function validateQrHash(qrCode: string) {
    const parts = qrCode.split("#");
    const user_id = parts[2];
    const expTime = parseInt(parts[1]);
    const generatedHash = generateQrHash(user_id, expTime);

    if (generatedHash.split("#")[0] !== parts[0]) {
        throw new Error("Invalid QR code");
    }

    return { user_id, expTime };
}
