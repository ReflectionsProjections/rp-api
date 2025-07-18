import { beforeEach, describe, expect, it } from "@jest/globals";
import {
    get,
    post,
    postAsAdmin,
    put,
    putAsAdmin,
    del,
    delAsStaff,
    delAsAdmin,
} from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import {
    EventType,
    InternalEvent,
    EventInputPayload,
    ExternalEventApiResponse,
    InternalEventApiResponse,
} from "./events-schema";
import { Role } from "../auth/auth-models";

const NOW = new Date();
const ONE_HOUR_MS = 1 * 60 * 60 * 1000;

const PAST_EVENT_VISIBLE = {
    eventId: "pastEvent001",
    name: "Past Visible Event",
    startTime: new Date(NOW.getTime() - 2 * ONE_HOUR_MS),
    endTime: new Date(NOW.getTime() - 1 * ONE_HOUR_MS),
    points: 10,
    description: "An event that already happened and was visible.",
    isVirtual: false,
    imageUrl: "http://example.com/past_event.png",
    location: "Room 101",
    eventType: EventType.enum.SPEAKER,
    isVisible: true,
    attendanceCount: 25,
} satisfies InternalEvent;

const UPCOMING_EVENT_VISIBLE_LATER = {
    eventId: "upcomingEvent002",
    name: "Upcoming Visible Event Later",
    startTime: new Date(NOW.getTime() + 2 * ONE_HOUR_MS),
    endTime: new Date(NOW.getTime() + 3 * ONE_HOUR_MS),
    points: 20,
    description: "An upcoming visible event.",
    isVirtual: true,
    imageUrl: null,
    location: "Online",
    eventType: EventType.enum.CORPORATE,
    isVisible: true,
    attendanceCount: 5,
} satisfies InternalEvent;

const UPCOMING_EVENT_HIDDEN_EARLIER = {
    eventId: "upcomingHiddenEvent003",
    name: "Upcoming Hidden Event Earlier",
    startTime: new Date(NOW.getTime() + 1 * ONE_HOUR_MS),
    endTime: new Date(NOW.getTime() + 1.5 * ONE_HOUR_MS),
    points: 0,
    description: "Internal event, not for public view.",
    isVirtual: false,
    imageUrl: "http://example.com/internal_event.png",
    location: "Siebel 2405",
    eventType: EventType.enum.SPECIAL,
    isVisible: false,
    attendanceCount: 50,
} satisfies InternalEvent;

const UPCOMING_EVENT_VISIBLE_SOONEST = {
    eventId: "upcomingEvent004",
    name: "Upcoming Visible Event Soonest",
    startTime: new Date(NOW.getTime() + 0.5 * ONE_HOUR_MS),
    endTime: new Date(NOW.getTime() + 1.5 * ONE_HOUR_MS),
    points: 15,
    description: "The very next visible event.",
    isVirtual: false,
    imageUrl: "http://example.com/soonest_event.png",
    location: "Siebel 1st Floor Atrium",
    eventType: EventType.enum.MEALS,
    isVisible: true,
    attendanceCount: 100,
} satisfies InternalEvent;

const NEW_EVENT_VALID_PAYLOAD = {
    name: "Brand New Event",
    startTime: new Date(NOW.getTime() + 10 * ONE_HOUR_MS),
    endTime: new Date(NOW.getTime() + 11 * ONE_HOUR_MS),
    points: 25,
    description: "A new event.",
    isVirtual: false,
    imageUrl: "http://example.com/new_valid_event.png",
    location: "Siebel 2405",
    eventType: EventType.enum.SPEAKER,
    isVisible: false,
    attendanceCount: 0,
} satisfies EventInputPayload;

const EVENT_UPDATE_FULL_PAYLOAD = {
    name: "Updated Event Name by PUT",
    startTime: new Date(NOW.getTime() + 5 * ONE_HOUR_MS),
    endTime: new Date(NOW.getTime() + 6 * ONE_HOUR_MS),
    points: 77,
    description: "This event has been updated via PUT.",
    isVirtual: true,
    imageUrl: "http://example.com/updated_image.png",
    location: "New Location after PUT",
    eventType: EventType.enum.MEALS,
    isVisible: true,
    attendanceCount: 99,
} satisfies EventInputPayload;

const EVENT_UPDATE_PARTIAL_PAYLOAD = {
    // same fields as UPCOMING_EVENT_HIDDEN_EARLIER but without the eventId field
    startTime: new Date(NOW.getTime() + 1 * ONE_HOUR_MS),
    endTime: new Date(NOW.getTime() + 1.5 * ONE_HOUR_MS),
    points: 0,
    isVirtual: false,
    imageUrl: "http://example.com/internal_event.png",
    location: "Siebel 2405",
    eventType: EventType.enum.SPECIAL,
    isVisible: false,
    attendanceCount: 50,

    // fields we are updating
    name: "Partially Updated Name",
    description: "Only name and description were meant to be updated.",
} satisfies EventInputPayload;

const NON_EXISTENT_EVENT_ID = "event1234566778";

function createExternalEventObject(
    eventData: InternalEvent
): ExternalEventApiResponse {
    return {
        eventId: eventData.eventId,
        name: eventData.name,
        startTime: eventData.startTime.toISOString(),
        endTime: eventData.endTime.toISOString(),
        points: eventData.points,
        description: eventData.description,
        isVirtual: eventData.isVirtual,
        imageUrl: eventData.imageUrl,
        location: eventData.location,
        eventType: eventData.eventType,
    };
}

function createInternalEventObject(
    eventData: InternalEvent
): InternalEventApiResponse {
    return {
        ...createExternalEventObject(eventData),
        isVisible: eventData.isVisible,
        attendanceCount: eventData.attendanceCount,
    };
}

beforeEach(async () => {
    await Database.EVENTS.create(PAST_EVENT_VISIBLE);
    await Database.EVENTS.create(UPCOMING_EVENT_VISIBLE_LATER);
    await Database.EVENTS.create(UPCOMING_EVENT_HIDDEN_EARLIER);
});

describe("GET /events/currentOrNext", () => {
    it("should return the soonest future visible event if one exists for a regular, non-staff or non-admin user", async () => {
        // create an event that is the soonest and check if it is returned
        await Database.EVENTS.create(UPCOMING_EVENT_VISIBLE_SOONEST);

        const response = await get("/events/currentOrNext").expect(
            StatusCodes.OK
        );
        expect(response.body).toMatchObject({
            ...UPCOMING_EVENT_VISIBLE_SOONEST,
            startTime: UPCOMING_EVENT_VISIBLE_SOONEST.startTime.toISOString(),
            endTime: UPCOMING_EVENT_VISIBLE_SOONEST.endTime.toISOString(),
        });
    });

    it("should return the later future visible event if it's the only future visible event for a regular, non-staff or non-admin user", async () => {
        const response = await get("/events/currentOrNext").expect(
            StatusCodes.OK
        );
        // should ignore the earlier, hidden event and return the later, visible event
        expect(response.body).toMatchObject({
            ...UPCOMING_EVENT_VISIBLE_LATER,
            startTime: UPCOMING_EVENT_VISIBLE_LATER.startTime.toISOString(),
            endTime: UPCOMING_EVENT_VISIBLE_LATER.endTime.toISOString(),
        });
    });

    it("should return status 204 NO CONTENT if the only events in the future are hidden events for a regular, non-staff or non-admin user", async () => {
        // delete the existing events
        await Database.EVENTS.deleteMany({});

        // add a future hidden event and a past visible event
        await Database.EVENTS.create(UPCOMING_EVENT_HIDDEN_EARLIER);
        await Database.EVENTS.create(PAST_EVENT_VISIBLE);

        await get("/events/currentOrNext").expect(StatusCodes.NO_CONTENT);
    });

    it("should return status 204 NO CONTENT if only past events exist", async () => {
        await Database.EVENTS.deleteMany({});
        await Database.EVENTS.create(PAST_EVENT_VISIBLE);

        await get("/events/currentOrNext").expect(StatusCodes.NO_CONTENT);
    });

    it("should return 204 NO CONTENT if NO events exist", async () => {
        await Database.EVENTS.deleteMany({});

        await get("/events/currentOrNext").expect(StatusCodes.NO_CONTENT);
    });

    it("should return an event starting now if it's visible", async () => {
        await Database.EVENTS.deleteMany({});

        const testCaseStartTime = new Date();

        const eventStartingNow = {
            ...UPCOMING_EVENT_VISIBLE_SOONEST,
            eventId: "eventNow123",
            startTime: new Date(testCaseStartTime.getTime() + 100),
            endTime: new Date(testCaseStartTime.getTime() + ONE_HOUR_MS + 100),
        } satisfies InternalEvent;

        await Database.EVENTS.create(eventStartingNow);

        const response = await get("/events/currentOrNext").expect(
            StatusCodes.OK
        );
        expect(response.body).toMatchObject({
            ...eventStartingNow,
            startTime: eventStartingNow.startTime.toISOString(),
            endTime: eventStartingNow.endTime.toISOString(),
        });
    });

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should return the soonest future event even if it is hidden for $description",
        async ({ role }) => {
            const response = await get("/events/currentOrNext", role).expect(
                StatusCodes.OK
            );
            expect(response.body).toMatchObject({
                ...UPCOMING_EVENT_HIDDEN_EARLIER,
                startTime:
                    UPCOMING_EVENT_HIDDEN_EARLIER.startTime.toISOString(),
                endTime: UPCOMING_EVENT_HIDDEN_EARLIER.endTime.toISOString(),
            });
        }
    );

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should return the soonest future VISIBLE event if it's earlier than any hidden one for $description",
        async ({ role }) => {
            await Database.EVENTS.deleteMany({});
            await Database.EVENTS.create(UPCOMING_EVENT_VISIBLE_SOONEST);
            await Database.EVENTS.create(UPCOMING_EVENT_HIDDEN_EARLIER);

            const response = await get("/events/currentOrNext", role).expect(
                StatusCodes.OK
            );
            expect(response.body).toMatchObject({
                ...UPCOMING_EVENT_VISIBLE_SOONEST,
                startTime:
                    UPCOMING_EVENT_VISIBLE_SOONEST.startTime.toISOString(),
                endTime: UPCOMING_EVENT_VISIBLE_SOONEST.endTime.toISOString(),
            });
        }
    );
});

describe("GET /events/", () => {
    it("should return only visible events, sorted by startTime then endTime, in a external view for a regular, non-staff or non-admin user", async () => {
        const anotherVisibleUpcomingEvent = {
            ...UPCOMING_EVENT_VISIBLE_SOONEST,
            eventId: "anotherVisibleEvent005",
        } satisfies InternalEvent;
        await Database.EVENTS.create(anotherVisibleUpcomingEvent);

        // expected visible events in order: PAST_EVENT_VISIBLE, antotherVisibleUpcoming, UPCOMING_EVENT_VISIBLE_LATER

        const response = await get("/events/").expect(StatusCodes.OK);

        const expected = [
            PAST_EVENT_VISIBLE,
            anotherVisibleUpcomingEvent,
            UPCOMING_EVENT_VISIBLE_LATER,
        ].map((event) => createExternalEventObject(event));
        expect(response.body).toEqual(expected);

        // verify that no hidden fields are present for the external view for a regular user
        response.body.forEach((event: ExternalEventApiResponse) => {
            expect(event).not.toHaveProperty("isVisible");
            expect(event).not.toHaveProperty("attendanceCount");
        });
    });

    it("should return an empty array if only hidden events exist for a regular, non-staff or non-admin user", async () => {
        await Database.EVENTS.deleteMany({});
        await Database.EVENTS.create(UPCOMING_EVENT_HIDDEN_EARLIER);

        const response = await get("/events/").expect(StatusCodes.OK);
        expect(response.body).toEqual([]);
    });

    it("should return an empty array if no events exist", async () => {
        await Database.EVENTS.deleteMany({});

        const response = await get("/events/").expect(StatusCodes.OK);
        expect(response.body).toEqual([]);
    });

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should return all events, including both visible and hidden, sorted by start time, in an internal view for $description",
        async ({ role }) => {
            await Database.EVENTS.create(UPCOMING_EVENT_VISIBLE_SOONEST);

            // expected order: PAST_EVENT_VISIBLE, UPCOMING_EVENT_VISIBLE_SOONEST, UPCOMING_EVENT_HIDDEN_EARLIER, UPCOMING_EVENT_VISIBLE_LATER

            const response = await get("/events/", role).expect(StatusCodes.OK);

            const expected = [
                PAST_EVENT_VISIBLE,
                UPCOMING_EVENT_VISIBLE_SOONEST,
                UPCOMING_EVENT_HIDDEN_EARLIER,
                UPCOMING_EVENT_VISIBLE_LATER,
            ].map((event) => createInternalEventObject(event));
            expect(response.body).toEqual(expected);

            // verify internal fields are present for the internal view of a staff or admin user
            response.body.forEach((event: InternalEventApiResponse) => {
                expect(event).toHaveProperty("isVisible");
                expect(event).toHaveProperty("attendanceCount");
            });
        }
    );

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should correctly sort all events by startTime (ascending order) then endTime (descending order) for $description",
        async ({ role }) => {
            await Database.EVENTS.deleteMany({});
            const eventA = {
                ...UPCOMING_EVENT_VISIBLE_SOONEST,
                eventId: "eventA",
                name: "A",
                startTime: new Date(NOW.getTime() + ONE_HOUR_MS),
                endTime: new Date(NOW.getTime() + 3 * ONE_HOUR_MS),
            };
            const eventB = {
                ...UPCOMING_EVENT_VISIBLE_SOONEST,
                eventId: "eventB",
                name: "B",
                startTime: new Date(NOW.getTime() + ONE_HOUR_MS),
                endTime: new Date(NOW.getTime() + 2 * ONE_HOUR_MS),
            };
            const eventC = {
                ...UPCOMING_EVENT_VISIBLE_SOONEST,
                eventId: "eventC",
                name: "C",
                startTime: new Date(NOW.getTime() + 0.5 * ONE_HOUR_MS),
                endTime: new Date(NOW.getTime() + 1.5 * ONE_HOUR_MS),
            };

            await Database.EVENTS.create(eventA); // same start time as B, but ends later
            await Database.EVENTS.create(eventB); // same start time as A, but ends earlier
            await Database.EVENTS.create(eventC); // starts earliest

            const response = await get("/events/", role).expect(StatusCodes.OK);
            expect(response.body).toHaveLength(3);

            // expected sort order: C, A, B
            const expected = [eventC, eventA, eventB].map((event) =>
                createInternalEventObject(event)
            );
            expect(response.body).toEqual(expected);
        }
    );
});

describe("GET /events/:EVENTID", () => {
    it("should return a visible event with an external view when requested by ID for a regular, non-staff or non-admin user", async () => {
        const response = await get(
            `/events/${UPCOMING_EVENT_VISIBLE_LATER.eventId}`
        ).expect(StatusCodes.OK);

        expect(response.body).toEqual(
            createExternalEventObject(UPCOMING_EVENT_VISIBLE_LATER)
        );
        expect(response.body).not.toHaveProperty("isVisible");
        expect(response.body).not.toHaveProperty("attendanceCount");
    });

    it("should return status 404 NOT FOUND when requesting a hidden event by ID for a regular, non-staff or non-admin user", async () => {
        await get(`/events/${UPCOMING_EVENT_HIDDEN_EARLIER.eventId}`).expect(
            StatusCodes.NOT_FOUND
        );
    });

    it("should return status 404 NOT FOUND when requesting a non existent eventId", async () => {
        await get(`/events/${NON_EXISTENT_EVENT_ID}`).expect(
            StatusCodes.NOT_FOUND
        );
    });

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should return a visible event with an internal view when requested by ID for $description",
        async ({ role }) => {
            const response = await get(
                `/events/${UPCOMING_EVENT_VISIBLE_LATER.eventId}`,
                role
            ).expect(StatusCodes.OK);

            expect(response.body).toEqual(
                createInternalEventObject(UPCOMING_EVENT_VISIBLE_LATER)
            );
            expect(response.body).toHaveProperty(
                "isVisible",
                UPCOMING_EVENT_VISIBLE_LATER.isVisible
            );
            expect(response.body).toHaveProperty(
                "attendanceCount",
                UPCOMING_EVENT_VISIBLE_LATER.attendanceCount
            );
        }
    );

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should return a hidden event with an internal view when requested by ID for $description",
        async ({ role }) => {
            const response = await get(
                `/events/${UPCOMING_EVENT_HIDDEN_EARLIER.eventId}`,
                role
            ).expect(StatusCodes.OK);

            expect(response.body).toEqual(
                createInternalEventObject(UPCOMING_EVENT_HIDDEN_EARLIER)
            );
            expect(response.body).toHaveProperty(
                "isVisible",
                UPCOMING_EVENT_HIDDEN_EARLIER.isVisible
            );
            expect(response.body).toHaveProperty(
                "attendanceCount",
                UPCOMING_EVENT_HIDDEN_EARLIER.attendanceCount
            );
        }
    );
});

describe("POST /events/", () => {
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/events/")
            .send(NEW_EVENT_VALID_PAYLOAD)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should create a new event for $description with valid data and return status CREATED",
        async ({ role }) => {
            await post("/events/", role)
                .send(NEW_EVENT_VALID_PAYLOAD)
                .expect(StatusCodes.CREATED);

            // must query by name and start time because eventId is generated upon creation
            const createdEvent = await Database.EVENTS.findOne({
                name: NEW_EVENT_VALID_PAYLOAD.name,
                startTime: NEW_EVENT_VALID_PAYLOAD.startTime,
            });

            expect(createdEvent?.toObject()).toMatchObject({
                ...NEW_EVENT_VALID_PAYLOAD,
                eventId: createdEvent?.eventId,
            });
        }
    );

    it.each([
        {
            description: "missing required 'name' field in payload",
            payload: { ...NEW_EVENT_VALID_PAYLOAD, name: undefined },
        },
        {
            description: "invalid 'startTime' (not a date) is given in payload",
            payload: { ...NEW_EVENT_VALID_PAYLOAD, startTime: "not-a-date" },
        },
        {
            description: "an extra field is given in payload",
            payload: {
                ...NEW_EVENT_VALID_PAYLOAD,
                unexpectedField: "should cause error",
            },
        },
        {
            description: "eventId is given in payload",
            payload: {
                ...NEW_EVENT_VALID_PAYLOAD,
                eventId: "clientProvidedId123",
            },
        },
    ])(
        "should return status BAD_REQUEST when $description for an ADMIN user",
        async ({ payload }) => {
            await postAsAdmin("/events/")
                .send(payload)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );
});

describe("PUT /events/:EVENTID", () => {
    it("should return UNAUTHORIZED for unauthenticated user", async () => {
        await put(`/events/${UPCOMING_EVENT_VISIBLE_LATER.eventId}`)
            .send(EVENT_UPDATE_FULL_PAYLOAD)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should update an existing event with a full update payload for $description",
        async ({ role }) => {
            await put(`/events/${UPCOMING_EVENT_VISIBLE_LATER.eventId}`, role)
                .send(EVENT_UPDATE_FULL_PAYLOAD)
                .expect(StatusCodes.OK);

            const updatedEventFromDb = await Database.EVENTS.findOne({
                eventId: UPCOMING_EVENT_VISIBLE_LATER.eventId,
            });
            expect(updatedEventFromDb?.toObject()).toMatchObject({
                ...EVENT_UPDATE_FULL_PAYLOAD,
                eventId: UPCOMING_EVENT_VISIBLE_LATER.eventId,
            });
        }
    );

    it.each([
        { role: Role.enum.ADMIN, description: "an ADMIN user" },
        { role: Role.enum.STAFF, description: "a STAFF user" },
    ])(
        "should update the specified fields of an existing event with a partial update payload for $description",
        async ({ role }) => {
            await put(`/events/${UPCOMING_EVENT_HIDDEN_EARLIER.eventId}`, role)
                .send(EVENT_UPDATE_PARTIAL_PAYLOAD)
                .expect(StatusCodes.OK);

            const updatedEventFromDb = await Database.EVENTS.findOne({
                eventId: UPCOMING_EVENT_HIDDEN_EARLIER.eventId,
            });

            // check to make sure that the fields that were not updated remain the same and that the fields that were updated have been changed
            expect(updatedEventFromDb?.toObject()).toMatchObject({
                ...UPCOMING_EVENT_HIDDEN_EARLIER,
                ...EVENT_UPDATE_PARTIAL_PAYLOAD,
                eventId: UPCOMING_EVENT_HIDDEN_EARLIER.eventId,
            });
        }
    );

    it("should return NOT_FOUND when trying to update a non-existent eventId", async () => {
        await putAsAdmin(`/events/${NON_EXISTENT_EVENT_ID}`)
            .send(EVENT_UPDATE_FULL_PAYLOAD)
            .expect(StatusCodes.NOT_FOUND);
    });

    it.each([
        {
            description: "undefined 'name' given",
            payload: { ...EVENT_UPDATE_FULL_PAYLOAD, name: undefined },
        },
        {
            description: "invalid 'points' (negative) given",
            payload: { ...EVENT_UPDATE_FULL_PAYLOAD, points: -10 },
        },
        {
            description: "an extra field is given in payload",
            payload: {
                ...EVENT_UPDATE_FULL_PAYLOAD,
                unexpectedField: "should cause error",
            },
        },
    ])("should return BAD_REQUEST when $description", async ({ payload }) => {
        await putAsAdmin(`/events/${UPCOMING_EVENT_VISIBLE_LATER.eventId}`)
            .send(payload)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("DELETE /events/:EVENTID", () => {
    it("should delete existing event and return NO_CONTENT for ADMIN user", async () => {
        await delAsAdmin(
            `/events/${UPCOMING_EVENT_VISIBLE_LATER.eventId}`
        ).expect(StatusCodes.NO_CONTENT);
        const deletedEvent = await Database.EVENTS.findOne({
            eventId: UPCOMING_EVENT_VISIBLE_LATER.eventId,
        });
        expect(deletedEvent).toBeNull();
    });

    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await del(`/events/${UPCOMING_EVENT_VISIBLE_LATER.eventId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return FORBIDDEN for STAFF user", async () => {
        await delAsStaff(
            `/events/${UPCOMING_EVENT_VISIBLE_LATER.eventId}`
        ).expect(StatusCodes.FORBIDDEN);
    });

    it("should return NOT_FOUND when trying to delete an event that doesn't exist", async () => {
        await delAsAdmin(`/events/${NON_EXISTENT_EVENT_ID}`).expect(
            StatusCodes.NOT_FOUND
        );
    });
});
