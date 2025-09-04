import { post, del, get } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import { v4 as uuidv4 } from "uuid";
import { TESTER } from "../../../testing/testingTools";

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSend = jest.fn();

const TEST_DEVICE_ID = "test-device-abc";

jest.mock("../../firebase", () => ({
    getFirebaseAdmin: () => ({
        messaging: () => ({
            subscribeToTopic: mockSubscribe,
            unsubscribeFromTopic: mockUnsubscribe,
            send: mockSend,
        }),
    }),
}));

jest.setTimeout(100000);

function makeTestAttendee(overrides = {}) {
    return {
        userId: TESTER.userId,
        points: 0,
        puzzlesCompleted: [],
        ...overrides,
    };
}

function makeTestRegistration(overrides = {}) {
    return {
        userId: TESTER.userId,
        name: "Ritam",
        email: TESTER.email,
        school: "UIUC",
        educationLevel: "BS",
        isInterestedMechMania: false,
        isInterestedPuzzleBang: true,
        allergies: [],
        dietaryRestrictions: [],
        ethnicity: [],
        gender: "prefer not say",
        graduationYear: "2027",
        ...overrides,
    };
}

type InsertTestAttendeeOverrides = {
    userId?: string;
    email?: string;
    points?: number;
    puzzlesCompleted?: string[];
    [key: string]: unknown;
};

async function insertTestUser(overrides: InsertTestAttendeeOverrides = {}) {
    const userId = overrides.userId || TESTER.userId;
    const email = overrides.email || TESTER.email;

    await SupabaseDB.AUTH_INFO.insert([
        {
            userId: userId,
            displayName: "Ritam",
            email: email,
            authId: "123",
        },
    ]).throwOnError();

    await SupabaseDB.AUTH_ROLES.insert([
        {
            userId: userId,
            role: Role.enum.USER,
        },
    ]).throwOnError();

    // Registrations
    await SupabaseDB.REGISTRATIONS.insert([
        makeTestRegistration({ userId: userId }),
    ]).throwOnError();

    // Attendee
    await SupabaseDB.ATTENDEES.insert([
        makeTestAttendee({ userId: userId, ...overrides }),
    ]).throwOnError();

    await SupabaseDB.NOTIFICATIONS.insert([
        {
            userId: userId,
            deviceId: TEST_DEVICE_ID,
        },
    ]).throwOnError();
}

describe("/notifications", () => {
    describe("POST /notifications/register", () => {
        it("should create a notification entry and subscribe to the allUsers topic", async () => {
            await SupabaseDB.AUTH_INFO.insert([
                {
                    userId: TESTER.userId,
                    displayName: "Ritam",
                    email: TESTER.email,
                    authId: "null",
                },
            ]).throwOnError();

            await SupabaseDB.AUTH_ROLES.insert([
                {
                    userId: TESTER.userId,
                    role: Role.enum.USER,
                },
            ]).throwOnError();

            await SupabaseDB.REGISTRATIONS.insert([
                makeTestRegistration({ userId: TESTER.userId }),
            ]).throwOnError();

            await SupabaseDB.ATTENDEES.insert([
                makeTestAttendee({ userId: TESTER.userId }),
            ]).throwOnError();

            await post("/notifications/register", Role.enum.USER)
                .send({ deviceId: "new-device-id" })
                .expect(StatusCodes.CREATED);

            const { data } = await SupabaseDB.NOTIFICATIONS.select()
                .eq("userId", TESTER.userId)
                .single()
                .throwOnError();
            expect(data?.deviceId).toBe("new-device-id");
            expect(mockSubscribe).toHaveBeenCalledWith(
                "new-device-id",
                "allUsers"
            );
        });
    });

    describe("POST /notifications/topics/:topicName", () => {
        it("should send a notification as an admin", async () => {
            await post("/notifications/topics/event_123", Role.enum.ADMIN)
                .send({ title: "Admin Test", body: "Admin Message" })
                .expect(StatusCodes.OK);

            // Verify Firebase mock was called
            expect(mockSend).toHaveBeenCalledWith({
                topic: "event_123",
                notification: {
                    title: "Admin Test",
                    body: "Admin Message",
                },
            });
        });
    });

    describe("/manual-users-topic", () => {
        // This setup runs once before each test inside this 'describe' block
        beforeEach(async () => {
            await insertTestUser();
        });

        it("POST should allow an admin to manually subscribe a user", async () => {
            await post("/notifications/manual-users-topic", Role.enum.ADMIN)
                .send({ userId: TESTER.userId, topicName: "food-priority-1" })
                .expect(StatusCodes.OK);

            expect(mockSubscribe).toHaveBeenCalledWith(
                TEST_DEVICE_ID,
                "food-priority-1"
            );
        });

        it("DELETE should allow an admin to manually unsubscribe a user", async () => {
            await del("/notifications/manual-users-topic", Role.enum.ADMIN)
                .send({ userId: TESTER.userId, topicName: "food-priority-1" })
                .expect(StatusCodes.OK);

            expect(mockUnsubscribe).toHaveBeenCalledWith(
                TEST_DEVICE_ID,
                "food-priority-1"
            );
        });
    });

    describe("GET /notifications/topics", () => {
        const TEST_EVENT_ID = uuidv4();
        const TEST_TOPIC_NAME = "food_wave_1";

        beforeEach(async () => {
            await SupabaseDB.EVENTS.insert({
                eventId: TEST_EVENT_ID,
                name: "Test Event",
                description: "Test event description",
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
                eventType: "SPECIAL",
                isVirtual: false,
                location: "Test Location",
                attendanceCount: 0,
                points: 0,
            });
            await SupabaseDB.CUSTOM_TOPICS.insert({
                topicName: TEST_TOPIC_NAME,
            });
        });

        it("should return a sorted list of all static, event, and custom topics", async () => {
            const response = await get(
                "/notifications/topics",
                Role.enum.ADMIN
            ).expect(StatusCodes.OK);

            const expectedTopics = [
                "allUsers",
                `event_${TEST_EVENT_ID}`,
                "food_wave_1",
            ].sort();

            expect(response.body.topics).toEqual(expectedTopics);
        });
    });

    describe("POST /notifications/custom-topic", () => {
        const NEW_TOPIC_NAME = "new_test_topic";

        it("should allow an admin to create a new custom topic", async () => {
            await post("/notifications/custom-topic", Role.enum.ADMIN)
                .send({ topicName: NEW_TOPIC_NAME })
                .expect(StatusCodes.CREATED);

            // Verify: Query the database to ensure the topic was created
            const { data } = await SupabaseDB.CUSTOM_TOPICS.select("topicName")
                .eq("topicName", NEW_TOPIC_NAME)
                .single()
                .throwOnError();

            expect(data?.topicName).toBe(NEW_TOPIC_NAME);
        });
    });
});

describe("Attendee Favorite/Unfavorite Logic", () => {
    it("should subscribe the user to a topic when they favorite an event", async () => {
        const testEventId = uuidv4();
        // Setup: Create the user and the specific event for this test
        await insertTestUser();
        await SupabaseDB.EVENTS.insert({
            id: testEventId,
            name: "Test Event",
            description: "Test event description",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
            eventType: "SPECIAL",
            isVirtual: false,
            location: "Test Location",
            attendanceCount: 0,
            points: 0,
        });

        // Action
        await post(`/attendee/favorites/${testEventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        // Verify
        expect(mockSubscribe).toHaveBeenCalledWith(
            TEST_DEVICE_ID,
            `event_${testEventId}`
        );

        // Cleanup
        await SupabaseDB.EVENTS.delete().eq("eventId", testEventId);
    });

    it("should unsubscribe the user from a topic when they unfavorite an event", async () => {
        const testEventId = uuidv4();
        // Setup: Create the user who has *already* favorited the event
        await insertTestUser({ favoriteEvents: [testEventId] });
        await SupabaseDB.EVENTS.insert({
            id: testEventId,
            name: "Test Event",
            description: "Test event description",
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
            eventType: "SPECIAL",
            isVirtual: false,
            location: "Test Location",
            attendanceCount: 0,
            points: 0,
        });

        // Action
        await del(`/attendee/favorites/${testEventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        // Verify
        expect(mockUnsubscribe).toHaveBeenCalledWith(
            TEST_DEVICE_ID,
            `event_${testEventId}`
        );

        // Cleanup
        await SupabaseDB.EVENTS.delete().eq("eventId", testEventId);
    });
});
