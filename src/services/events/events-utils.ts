import { Database } from "../../database";

export async function checkInUser(eventId: string, userId: string) {
    // Check if the event and attendee exist
    const event = await Database.EVENTS.findOne({ eventId });
    const attendee = await Database.ATTENDEES.findOne({ userId });

    if (!event || !attendee) {
        return { success: false, message: "Event or Attendee not found" };
    }

    // Check or create event attendance record
    let eventAttendance = await Database.EVENTS_ATT.findOne({ eventId });
    if (!eventAttendance) {
        eventAttendance = await Database.EVENTS_ATT.create({
            eventId: eventId,
            attendees: [userId],
        });
    } else {
        if (!eventAttendance.attendees.includes(userId)) {
            eventAttendance.attendees.push(userId);
        }
    }
    await eventAttendance.save();

    // Check or create attendee attendance record
    let attendeeAttendance = await Database.ATTENDEES_ATT.findOne({ userId });
    if (!attendeeAttendance) {
        attendeeAttendance = new Database.ATTENDEES_ATT({
            userId: userId,
            eventsAttended: [eventId],
        });
    } else {
        if (!attendeeAttendance.eventsAttended.includes(eventId)) {
            attendeeAttendance.eventsAttended.push(eventId);
        }
    }
    await attendeeAttendance.save();
    return { success: true };
}
