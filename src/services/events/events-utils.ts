import { Database } from "../../database";

export async function checkInUser(eventId: string, userId: string) {
    // Check if the event and attendee exist
    const [event, attendee] = await Promise.all([
        Database.EVENTS.findOne({ eventId }),
        Database.ATTENDEE.findOne({ userId }),
    ]);

    console.log(event);
    console.log(attendee);
    if (!event || !attendee) {
        return { success: false, message: "Event or Attendee not found" };
    }

    try {
        // Check or create event attendance record
        const eventAttendance = Database.EVENTS_ATTENDANCE.findOneAndUpdate(
            { eventId: eventId },
            { $addToSet: { attendees: userId } },
            { new: true, upsert: true }
        );

        // Check or create attendee attendance record
        const attendeeAttendance =
            Database.ATTENDEE_ATTENDANCE.findOneAndUpdate(
                { userId: userId },
                { $addToSet: { eventsAttended: eventId } },
                { new: true, upsert: true }
            );

        await Promise.all([eventAttendance, attendeeAttendance]);
        return { success: true };
    } catch (error) {
        return { success: false, message: "couldn't upsert event or attendee" };
    }
}
