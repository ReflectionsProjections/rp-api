import { Database } from "../../database";

function getCurrentDay() {
    const currDate = new Date();
    const dayString = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
    }).format(currDate);
    return dayString;
}

async function checkEventAndAttendeeExist(eventId: string, userId: string) {
    const [event, attendee] = await Promise.all([
        Database.EVENTS.exists({ eventId }),
        Database.ATTENDEE.exists({ userId }),
    ]);

    if (!event || !attendee) {
        throw new Error("Event or Attendee not found");
    }
    if (!("points" in event)) {
        throw new Error("Event or Attendee not found");
    }

    return event.points as number;
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
        throw new Error("Is Duplicate");
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

async function updateAttendanceRecords(
    eventId: string,
    userId: string,
    eventPoints: number
) {
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
        Database.ATTENDEE.findOneAndUpdate(
            { userId },
            { $inc: { points: eventPoints } },
            { new: true }
        ),
    ]);
}

export async function checkInUserToEvent(
    eventId: string,
    userId: string,
    isCheckin: boolean = false
) {
    const eventPoints = await checkEventAndAttendeeExist(eventId, userId);
    await checkForDuplicateAttendance(eventId, userId);

    if (!isCheckin) {
        await updateAttendeePriority(userId);
    }

    await updateAttendanceRecords(eventId, userId, eventPoints);
}
