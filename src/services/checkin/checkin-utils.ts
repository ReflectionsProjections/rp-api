import { Database } from "../../database";
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
    const [event, attendee] = await Promise.all([
        Database.EVENTS.exists({ eventId }),
        Database.ATTENDEE.exists({ userId }),
    ]);

    if (!event || !attendee) {
        throw new Error("Event or Attendee not found");
    }

    return Promise.resolve();
}

async function checkForDuplicateAttendance(eventId: string, userId: string) {
    const [isRepeatEvent, isRepeatAttendee] = await Promise.all([
        Database.EVENTS_ATTENDANCE.exists({ eventId, attendees: userId }),
        Database.ATTENDEE_ATTENDANCE.exists({
            userId,
            eventsAttended: eventId,
        }),
    ]);

    if (isRepeatEvent || isRepeatAttendee) {
        throw new Error("IsDuplicate");
    }
}

// Update attendee priority for the current day
async function updateAttendeePriority(userId: string) {
    const day = getCurrentDay();
    await Database.ATTENDEE.findOneAndUpdate(
        { userId },
        { $set: { [`hasPriority.${day}`]: true } }
    );
}

async function updateAttendanceRecords(eventId: string, userId: string) {
    await Promise.all([
        Database.EVENTS_ATTENDANCE.findOneAndUpdate(
            { eventId },
            { $addToSet: { attendees: userId } },
            { new: true, upsert: true }
        ),
        Database.ATTENDEE_ATTENDANCE.findOneAndUpdate(
            { userId },
            { $addToSet: { eventsAttended: eventId } },
            { new: true, upsert: true }
        ),
        Database.EVENTS.findOneAndUpdate(
            { eventId },
            { $inc: { attendanceCount: 1 } },
            { new: true, upsert: true }
        ),
    ]);
}

async function assignPixelsToUser(userId: string, pixels: number) {
    const updatedDoc = await Database.ATTENDEE.findOneAndUpdate(
        { userId },
        { $inc: { points: pixels } },
        { new: true }
    );

    const new_points = updatedDoc!.points;
    const updatedFields = {
        "isEligibleMerch.Cap": new_points >= 50,
        "isEligibleMerch.Tote": new_points >= 35,
        "isEligibleMerch.Button": new_points >= 20,
        "isEligibleMerch.Tshirt": new_points >= 0,
    };

    await Database.ATTENDEE.findOneAndUpdate(
        { userId },
        { $set: updatedFields }
    );
}

async function markUserAsCheckedIn(userId: string) {
    await Database.ATTENDEE.findOneAndUpdate(
        { userId },
        { hasCheckedIn: true }
    );
}

export async function checkInUserToEvent(eventId: string, userId: string) {
    await checkEventAndAttendeeExist(eventId, userId);
    await checkForDuplicateAttendance(eventId, userId);

    const event = await Database.EVENTS.findOne({ eventId });
    if (!event) {
        throw new Error("Event not found");
    }

    // check for checkin event, and for meals
    if (event.eventType == EventType.Enum.CHECKIN) {
        await markUserAsCheckedIn(userId);
    } else if (event.eventType != EventType.Enum.MEALS) {
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
