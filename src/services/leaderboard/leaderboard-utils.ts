import { SupabaseDB, TierType, IconColorType, supabase } from "../../database";
import { LeaderboardEntry } from "./leaderboard-schema";

/**
 * Get the daily leaderboard for a specific day, excluding TIER3 users
 * @param day - The day in YYYY-MM-DD format (Central Time)
 * @param n - Number of top attendees to include
 * @returns Promise<LeaderboardEntry[]> - Ranked list of attendees with ties handled
 */
export async function getDailyLeaderboard(
    day: string,
    n: number
): Promise<LeaderboardEntry[]> {
    // Step 1: Get all eligible attendees (not TIER3) with their info
    const { data: attendees } = await SupabaseDB.ATTENDEES.select(
        `
            userId,
            currentTier,
            icon,
            authInfo!inner(displayName)
        `
    )
        .neq("currentTier", "TIER3")
        .throwOnError();

    if (!attendees || attendees.length === 0) {
        return [];
    }

    // Step 2: Get events for the specified day in Central Time
    // Since September is in CDT (UTC-5), use that offset
    const startOfDay = `${day}T00:00:00-05:00`;
    const endOfDay = `${day}T23:59:59.999-05:00`;

    const { data: dayEvents } = await SupabaseDB.EVENTS.select(
        "eventId, points"
    )
        .gte("startTime", startOfDay)
        .lte("startTime", endOfDay)
        .throwOnError();

    if (!dayEvents || dayEvents.length === 0) {
        // No events on this day - no leaderboard possible
        return [];
    }

    const eventIds = dayEvents.map((e) => e.eventId);

    // Step 3: Get all attendances for these events
    const { data: attendances } = await SupabaseDB.EVENT_ATTENDANCES.select(
        "attendee, eventId"
    )
        .in("eventId", eventIds)
        .throwOnError();

    // Step 4: Calculate daily points for each attendee
    const userDailyPoints = new Map<string, number>();

    // Initialize all eligible attendees with 0 points
    attendees.forEach((attendee) => {
        userDailyPoints.set(attendee.userId, 0);
    });

    // Calculate points from attendances
    if (attendances) {
        attendances.forEach((attendance) => {
            const event = dayEvents.find(
                (e) => e.eventId === attendance.eventId
            );
            if (event && userDailyPoints.has(attendance.attendee)) {
                const currentPoints =
                    userDailyPoints.get(attendance.attendee) || 0;
                userDailyPoints.set(
                    attendance.attendee,
                    currentPoints + event.points
                );
            }
        });
    }

    // Step 5: Create leaderboard entries and sort
    const leaderboardEntries: Array<LeaderboardEntry & { tempPoints: number }> =
        attendees.map((attendee) => ({
            rank: 0,
            userId: attendee.userId,
            displayName: attendee.authInfo.displayName,
            points: userDailyPoints.get(attendee.userId) || 0,
            currentTier: attendee.currentTier as TierType,
            icon: attendee.icon as IconColorType,
            tempPoints: userDailyPoints.get(attendee.userId) || 0,
        }));

    // Sort by points descending
    leaderboardEntries.sort((a, b) => b.tempPoints - a.tempPoints);

    // Step 6: Assign ranks (handle ties)
    let currentRank = 1;
    let previousPoints = -1;

    const rankedEntries = leaderboardEntries.map((entry, index) => {
        if (entry.tempPoints !== previousPoints) {
            currentRank = index + 1;
        }

        previousPoints = entry.tempPoints;

        return {
            rank: currentRank,
            userId: entry.userId,
            displayName: entry.displayName,
            points: entry.points,
            currentTier: entry.currentTier,
            icon: entry.icon,
        };
    });

    // Step 7: Filter to top n (including ties)
    const topRank =
        rankedEntries[Math.min(n - 1, rankedEntries.length - 1)]?.rank || 1;
    return rankedEntries.filter((entry) => entry.rank <= topRank);
}

/**
 * Get the global leaderboard based on total accumulated points
 * @param n - Number of top attendees to include
 * @returns Promise<LeaderboardEntry[]> - Ranked list of attendees with ties handled
 */
export async function getGlobalLeaderboard(
    n: number
): Promise<LeaderboardEntry[]> {
    // Get all attendees with their total points, including all tiers
    const { data: attendees } = await SupabaseDB.ATTENDEES.select(
        `
            userId,
            points,
            currentTier,
            icon,
            authInfo!inner(displayName)
        `
    )
        .order("points", { ascending: false })
        .throwOnError();

    if (!attendees || attendees.length === 0) {
        return [];
    }

    // Create leaderboard entries with rankings
    let currentRank = 1;
    let previousPoints = -1;

    const rankedEntries = attendees.map((attendee, index) => {
        if (attendee.points !== previousPoints) {
            currentRank = index + 1;
        }

        previousPoints = attendee.points;

        return {
            rank: currentRank,
            userId: attendee.userId,
            displayName: attendee.authInfo.displayName,
            points: attendee.points,
            currentTier: attendee.currentTier as TierType,
            icon: attendee.icon as IconColorType,
        };
    });

    // Filter to top n (including ties)
    const topRank =
        rankedEntries[Math.min(n - 1, rankedEntries.length - 1)]?.rank || 1;
    return rankedEntries.filter((entry) => entry.rank <= topRank);
}

/**
 * Promote users to their next tier (TIER1 -> TIER2 -> TIER3)
 * @param userIds - Array of userIds to promote (should come from leaderboard winners)
 * @returns Promise<number> - Number of users actually promoted
 */
export async function promoteUsersToNextTier(
    userIds: string[]
): Promise<number> {
    if (!userIds || userIds.length === 0) {
        return 0;
    }

    // Call the PostgreSQL function for atomic tier promotion
    const { data, error } = await supabase.rpc("promote_users_batch", {
        user_ids: userIds,
    });

    if (error) {
        throw error;
    }

    return data || 0;
}

/**
 * Record a leaderboard submission in the database
 * @param day - The day that was submitted
 * @param count - The number of winners that were selected
 * @param submittedBy - The userId of the admin who submitted
 * @returns Promise<string> - The submissionId of the created record
 */
export async function recordLeaderboardSubmission(
    day: string,
    count: number,
    submittedBy: string
): Promise<{ submissionId: string; submittedAt: string }> {
    const { data } = await SupabaseDB.LEADERBOARD_SUBMISSIONS.insert({
        day,
        count,
        submittedBy,
    })
        .select("submissionId, submittedAt")
        .single()
        .throwOnError();

    return {
        submissionId: data.submissionId,
        submittedAt: data.submittedAt,
    };
}
