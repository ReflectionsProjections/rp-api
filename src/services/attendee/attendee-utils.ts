import { SupabaseDB } from "../../database";

/**
 * Event start date: September 16, 2025 in Central Time
 * Maps calendar dates to event days (1-5)
 */
const EVENT_START_DATE = new Date("2025-09-16T00:00:00-05:00");

/**
 * Convert any date to Central Time at midnight (for day boundary calculations)
 * @param date - Date to convert (defaults to current date)
 * @returns Date object representing the date at midnight in Central Time
 */
function getCentralDateAtMidnight(date: Date = new Date()): Date {
    const centralTimeString = date.toLocaleDateString('en-CA', {
        timeZone: 'America/Chicago'
    });

    return new Date(centralTimeString + 'T00:00:00-05:00');
}

/**
 * Map a calendar date to an event day number (1-5)
 * @param date - Date object to map
 * @returns Event day number (1-5) or null if outside event range
 */
function mapDateToEventDay(date: Date): number | null {
    const centralDate = getCentralDateAtMidnight(date);
    
    const diffTime = centralDate.getTime() - EVENT_START_DATE.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Event runs for 5 days (0-4 maps to days 1-5)
    if (diffDays >= 0 && diffDays < 5) {
        return diffDays + 1;
    }
    
    return null; // Outside event range
}

/**
 * Add points to an attendee's global and daily totals
 * @param userId - The attendee's user ID
 * @param points - Points to add
 * @param date - Optional date for daily points (defaults to current Central Time date)
 * @returns Promise<void>
 */
export async function addPoints(
    userId: string, 
    points: number, 
    date?: Date
): Promise<void> {

    const targetDate = date || getCentralDateAtMidnight();
    const eventDay = mapDateToEventDay(targetDate);

    const { data: attendee } = await SupabaseDB.ATTENDEES.select(
        "points, pointsDay1, pointsDay2, pointsDay3, pointsDay4, pointsDay5"
    )
        .eq("userId", userId)
        .single()
        .throwOnError();

    const updateData: Record<string, number> = {
        points: (attendee.points || 0) + points,
    };

    if (eventDay !== null) {
        const dailyColumn = `pointsDay${eventDay}` as keyof typeof attendee;
        const currentDailyPoints = attendee[dailyColumn] || 0;
        updateData[dailyColumn] = currentDailyPoints + points;
    }

    await SupabaseDB.ATTENDEES.update(updateData)
        .eq("userId", userId)
        .throwOnError();
}

/**
 * Get event day number for a specific date (exported for external use)
 * @param date - Date to check
 * @returns Event day number (1-5) or null if outside event range
 */
export { mapDateToEventDay as getEventDayForDate };
