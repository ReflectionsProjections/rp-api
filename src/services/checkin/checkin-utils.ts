import { Database } from "../../database";

export async function checkInUserToEvent(eventId: string, userId: string) {
    // Check if the event and attendee exist
    const [event, attendee] = await Promise.all([
        Database.EVENTS.findOne({ eventId }),
        Database.ATTENDEE.findOne({ userId }),
    ]);

    if (!event || !attendee) {
        return Promise.reject("Event or Attendee not found");
    }

    const eventAttendancePromise = Database.EVENTS_ATTENDANCE.findOneAndUpdate(
        { eventId },
        { $addToSet: { attendees: userId } },
        { new: true, upsert: true }
    );

    const attendeeAttendancePromise =
        Database.ATTENDEE_ATTENDANCE.findOneAndUpdate(
            { userId },
            { $addToSet: { eventsAttended: eventId } },
            { new: true, upsert: true }
        );

    return Promise.all([eventAttendancePromise, attendeeAttendancePromise])
        .then(() => ({ success: true }))
        .catch(() => ({
            success: false,
            message: "Couldn't upsert event or attendee",
        }));
}
