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

async function checkEventAndAttendeeExist(eventId: string, userId: string) {
    const [eventRes, attendeeRes] = await Promise.all([
        SupabaseDB.EVENTS.select("eventId").eq("eventId", eventId).single(),
        SupabaseDB.ATTENDEES.select("userId").eq("userId", userId).single(),
    ]);

    if (!eventRes.data || !attendeeRes.data) {
        throw new Error("Event or Attendee not found");
    }
}

async function checkForDuplicateAttendance(eventId: string, userId: string) {
    const [isRepeatInEvent, isRepeatInAttendee] = await Promise.all([
        SupabaseDB.EVENT_ATTENDANCES.select()
            .eq("eventId", eventId)
            .eq("attendee", userId)
            .maybeSingle()
            .throwOnError(),
        SupabaseDB.ATTENDEE_ATTENDANCES.select()
            .eq("userId", userId)
            .contains("eventsAttended", [eventId])
            .maybeSingle()
            .throwOnError(),
    ]);

    if (isRepeatInEvent.data || isRepeatInAttendee.data) {
        throw new Error("IsDuplicate");
    }
}

// Update attendee priority for the current day
async function updateAttendeePriority(userId: string) {
    const day = getCurrentDay();
    await SupabaseDB.ATTENDEES.update({
        [`hasPriority${day}`]: true,
    })
        .eq("userId", userId)
        .throwOnError();
}

async function updateAttendanceRecords(eventId: string, userId: string) {
    const { data: attendeeAttendance } =
        await SupabaseDB.ATTENDEE_ATTENDANCES.select("eventsAttended")
            .eq("userId", userId)
            .maybeSingle()
            .throwOnError();

    const eventsAttended = attendeeAttendance?.eventsAttended || [];

    if (!eventsAttended.includes(eventId)) {
        const newEventsAttended = [...eventsAttended, eventId];
        await SupabaseDB.ATTENDEE_ATTENDANCES.upsert({
            userId: userId,
            eventsAttended: newEventsAttended,
        }).throwOnError();
    }

    await SupabaseDB.EVENT_ATTENDANCES.insert({
        eventId: eventId,
        attendee: userId,
    }).throwOnError();

    const { data: eventData } = await SupabaseDB.EVENTS.select(
        "attendanceCount"
    )
        .eq("eventId", eventId)
        .single()
        .throwOnError();

    const currentCount = eventData?.attendanceCount || 0;
    await SupabaseDB.EVENTS.update({ attendanceCount: currentCount + 1 })
        .eq("eventId", eventId)
        .throwOnError();
}

async function assignPixelsToUser(userId: string, pixels: number) {
    const { data: attendee } = await SupabaseDB.ATTENDEES.select("points")
        .eq("userId", userId)
        .single()
        .throwOnError();

    const newPoints = (attendee?.points || 0) + pixels;

    const updatedFields = {
        points: newPoints,
        isEligibleCap: newPoints >= 50,
        isEligibleTote: newPoints >= 35,
        isEligibleButton: newPoints >= 20,
        isEligibleTshirt: newPoints >= 0,
    };

    await SupabaseDB.ATTENDEES.update(updatedFields)
        .eq("userId", userId)
        .throwOnError();
}

export async function checkInUserToEvent(eventId: string, userId: string) {
    await checkEventAndAttendeeExist(eventId, userId);
    await checkForDuplicateAttendance(eventId, userId);

    const { data: event } = await SupabaseDB.EVENTS.select("eventType, points")
        .eq("eventId", eventId)
        .single()
        .throwOnError();

    if (
        event.eventType !== EventType.Enum.MEALS &&
        event.eventType !== EventType.Enum.CHECKIN
    ) {
        await updateAttendeePriority(userId);
    }

    await updateAttendanceRecords(eventId, userId);
    await assignPixelsToUser(userId, event.points);
}

export function generateQrHash(userId: string, expTime: number) {
    let hashStr = userId + "#" + expTime;
    const hashIterations = Config.QR_HASH_ITERATIONS;
    const hashSecret = Config.QR_HASH_SECRET;

    const hmac = crypto.createHmac("sha256", hashSecret);
    hashStr = hmac.update(hashStr).digest("hex");

    for (let i = 0; i < hashIterations; i++) {
        const hash = crypto.createHash("sha256");
        hashStr = hash.update(hashSecret + "#" + hashStr).digest("hex");
    }

    return `${hashStr}#${expTime}#${userId}`;
}

export function validateQrHash(qrCode: string) {
    const parts = qrCode.split("#");
    const userId = parts[2];
    const expTime = parseInt(parts[1]);
    const generatedHash = generateQrHash(userId, expTime);

    if (generatedHash.split("#")[0] !== parts[0]) {
        throw new Error("Invalid QR code");
    }

    return { userId, expTime };
}
