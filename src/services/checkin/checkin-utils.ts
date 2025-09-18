import { SupabaseDB } from "../../database";
import crypto from "crypto";
import { Config } from "../../config";
import { EventType } from "../events/events-schema";
import { DayKey } from "../attendee/attendee-schema";
import { addPoints } from "../attendee/attendee-utils";
import { getFirebaseAdmin } from "../../firebase";

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

    if (!eventRes.data) {
        throw new Error("Event not found");
    }

    if (!attendeeRes.data) {
        throw new Error(`Attendee ${userId} not found`);
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
    // subscribe them to the food wave 1 topic for today
    const { data: userDevice } = await SupabaseDB.NOTIFICATIONS.select(
        "deviceId"
    )
        .eq("userId", userId)
        .maybeSingle()
        .throwOnError();
    if (!userDevice?.deviceId) {
        return; // we can just be done here if they don't have a deviceId
    }
    const topicName = `food-wave-1-${day.toLowerCase()}`;
    await getFirebaseAdmin()
        .messaging()
        .subscribeToTopic(userDevice.deviceId, topicName);
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
    await addPoints(userId, pixels);
}

export async function checkInUserToEvent(eventId: string, userId: string) {
    await checkEventAndAttendeeExist(eventId, userId);
    await checkForDuplicateAttendance(eventId, userId);

    const { data: event } = await SupabaseDB.EVENTS.select("eventType, points")
        .eq("eventId", eventId)
        .single()
        .throwOnError();

    // Update attendance records first
    await updateAttendanceRecords(eventId, userId);

    // Check if user should get priority (only for non-meal/checkin events and if they have attended >1 event)
    if (
        event.eventType !== EventType.Enum.MEALS &&
        event.eventType !== EventType.Enum.CHECKIN
    ) {
        // Check how many events the user has attended (including the current one)
        const { data: attendeeAttendance } =
            await SupabaseDB.ATTENDEE_ATTENDANCES.select("eventsAttended")
                .eq("userId", userId)
                .maybeSingle()
                .throwOnError();

        const eventsAttended = attendeeAttendance?.eventsAttended || [];

        if (eventsAttended.length > 0) {
            // Get details of all attended events to filter by type and day
            const { data: attendedEvents } = await SupabaseDB.EVENTS.select(
                "eventId, eventType, startTime"
            )
                .in("eventId", eventsAttended)
                .throwOnError();

            const currentDay = getCurrentDay();

            // Filter events: exclude MEALS and CHECKIN, and only count events from current day
            const filteredEvents =
                attendedEvents?.filter((eventData) => {
                    const eventDate = new Date(eventData.startTime);
                    const eventDay = new Intl.DateTimeFormat("en-US", {
                        timeZone: "America/Chicago",
                        weekday: "short",
                    }).format(eventDate) as DayKey;

                    return (
                        eventData.eventType !== EventType.Enum.MEALS &&
                        eventData.eventType !== EventType.Enum.CHECKIN &&
                        eventDay === currentDay
                    );
                }) || [];

            // Only give priority if they have attended 2 more than 1 qualifying event today
            if (filteredEvents.length >= 2) {
                await updateAttendeePriority(userId);
            }
        }
    }
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
