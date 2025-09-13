import { SupabaseDB, TierType, IconColorType, supabase } from "../../database";
import { LeaderboardEntry } from "./leaderboard-schema";
import { getEventDayForDate } from "../attendee/attendee-utils";

function getDailyPointsForEventDay(
    attendee: {
        pointsDay1: number;
        pointsDay2: number;
        pointsDay3: number;
        pointsDay4: number;
        pointsDay5: number;
    },
    eventDay: number
): number {
    switch (eventDay) {
        case 1:
            return attendee.pointsDay1 || 0;
        case 2:
            return attendee.pointsDay2 || 0;
        case 3:
            return attendee.pointsDay3 || 0;
        case 4:
            return attendee.pointsDay4 || 0;
        case 5:
            return attendee.pointsDay5 || 0;
        default:
            return 0;
    }
}

/**
 * Get the daily leaderboard for a specific day, excluding TIER4
 * @param day - The day in YYYY-MM-DD format (Central Time)
 * @param n - Number of top attendees to include (optional - returns all if not specified)
 * @returns Promise<LeaderboardEntry[]> - Ranked list of attendees with ties handled
 */
export async function getDailyLeaderboard(
    day: string,
    n?: number
): Promise<LeaderboardEntry[]> {
    // Step 1: Map day string to event day number (Central Time)
    const dayDate = new Date(day + "T00:00:00-05:00");
    const eventDay = getEventDayForDate(dayDate);

    if (eventDay === null) {
        return [];
    }

    // Step 2: Get all eligible attendees with their daily points for this day
    const { data: attendees } = await SupabaseDB.ATTENDEES.select(
        `
            userId,
            pointsDay1,
            pointsDay2,
            pointsDay3,
            pointsDay4,
            pointsDay5,
            currentTier,
            icon,
            authInfo!inner(displayName)
        `
    )
        .neq("currentTier", "TIER4")
        .throwOnError();

    if (!attendees || attendees.length === 0) {
        return [];
    }

    // Step 3: Create leaderboard entries with daily points
    const leaderboardEntries: Array<LeaderboardEntry> = attendees.map(
        (attendee) => ({
            rank: 0, // Will be set after sorting
            userId: attendee.userId,
            displayName: attendee.authInfo.displayName,
            points: getDailyPointsForEventDay(attendee, eventDay),
            currentTier: attendee.currentTier as TierType,
            icon: attendee.icon as IconColorType,
        })
    );

    // Step 4: Sort by daily points descending, then by displayName ascending for ties
    leaderboardEntries.sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        return a.displayName
            .toLowerCase()
            .localeCompare(b.displayName.toLowerCase());
    });

    // Step 5: Assign ranks (handle ties)
    let currentRank = 1;
    let previousPoints = -1;

    const rankedEntries = leaderboardEntries.map((entry, index) => {
        if (entry.points !== previousPoints) {
            currentRank = index + 1;
        }

        previousPoints = entry.points;

        return {
            rank: currentRank,
            userId: entry.userId,
            displayName: entry.displayName,
            points: entry.points,
            currentTier: entry.currentTier,
            icon: entry.icon,
        };
    });

    // Step 6: Filter to top n (including ties) or return all if n is not specified
    if (n === undefined) {
        return rankedEntries;
    }

    const topRank =
        rankedEntries[Math.min(n - 1, rankedEntries.length - 1)]?.rank || 1;
    return rankedEntries.filter((entry) => entry.rank <= topRank);
}

/**
 * Get the global leaderboard based on total accumulated points
 * @param n - Number of top attendees to include (optional - returns all if not specified)
 * @returns Promise<LeaderboardEntry[]> - Ranked list of attendees with ties handled
 */
export async function getGlobalLeaderboard(
    n?: number
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
    ).throwOnError();

    if (!attendees || attendees.length === 0) {
        return [];
    }

    // Sort by points descending, then by displayName ascending for ties
    attendees.sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        return a.authInfo.displayName
            .toLowerCase()
            .localeCompare(b.authInfo.displayName.toLowerCase());
    });

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

    // Filter to top n (including ties) or return all if n is not specified
    if (n === undefined) {
        return rankedEntries;
    }

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
 * Check if a leaderboard submission already exists for a specific day
 * @param day - The day to check (YYYY-MM-DD format)
 * @returns Promise<{ exists: boolean; submission?: { submissionId: string; submittedAt: string; submittedBy: string; count: number } }>
 */
export async function checkLeaderboardSubmissionExists(day: string): Promise<{
    exists: boolean;
    submission?: {
        submissionId: string;
        submittedAt: string;
        submittedBy: string;
        count: number;
    };
}> {
    const { data } = await SupabaseDB.LEADERBOARD_SUBMISSIONS.select(
        "submissionId, submittedAt, submittedBy, count"
    )
        .eq("day", day)
        .maybeSingle()
        .throwOnError();

    if (!data) {
        return { exists: false };
    }

    return {
        exists: true,
        submission: {
            submissionId: data.submissionId,
            submittedAt: data.submittedAt,
            submittedBy: data.submittedBy,
            count: data.count,
        },
    };
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
