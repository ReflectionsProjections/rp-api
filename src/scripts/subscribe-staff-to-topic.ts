import "dotenv/config";
import { SupabaseDB } from "../database";
import { getFirebaseAdmin } from "../firebase";

async function main() {
    const topicName = "allStaff";
    // Ensure topic exists in Supabase customTopics
    const { data: existing } = await SupabaseDB.CUSTOM_TOPICS.select(
        "topicName"
    )
        .eq("topicName", topicName)
        .maybeSingle();

    if (!existing) {
        await SupabaseDB.CUSTOM_TOPICS.insert({ topicName }).throwOnError();
        console.log(`Created custom topic in Supabase: ${topicName}`);
    }

    // Find all staff userIds from authRoles
    const { data: staffRoles, error: staffErr } =
        await SupabaseDB.AUTH_ROLES.select("userId")
            .eq("role", "STAFF")
            .throwOnError();
    if (staffErr) throw staffErr;

    const staffUserIds = (staffRoles ?? []).map(
        (r: { userId: string }) => r.userId
    );
    if (staffUserIds.length === 0) {
        console.log("No staff userIds found. Nothing to subscribe.");
        process.exit(0);
    }

    const { data: userDevices } = await SupabaseDB.NOTIFICATIONS.select(
        "userId, deviceId"
    )
        .in("userId", staffUserIds)
        .throwOnError();

    const deviceTokens = (userDevices ?? [])
        .map((d: { deviceId: string | null }) => d.deviceId)
        .filter((t: string | null): t is string => Boolean(t));

    if (deviceTokens.length === 0) {
        console.log("No device tokens found for staff. Exiting.");
        process.exit(0);
    }

    const admin = getFirebaseAdmin();
    await admin.messaging().subscribeToTopic(deviceTokens, topicName); // we have like 50 people on staff
    console.log(
        `Done. Subscribed ${deviceTokens.length} device(s) for ${staffUserIds.length} staff.`
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
