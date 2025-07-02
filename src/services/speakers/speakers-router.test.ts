import { beforeEach, describe, expect, it } from "@jest/globals";
import {
    get,
    post,
    postAsStaff,
    postAsAdmin,
    put,
    putAsStaff,
    putAsAdmin,
    del,
    delAsStaff,
    delAsAdmin,
} from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { v4 as uuidv4 } from "uuid";
import { SpeakerType, UpdateSpeakerType } from "./speakers-schema";
import { SupabaseDB } from "../../supabase";

const SPEAKER_1_ID = uuidv4();
const SPEAKER_2_ID = uuidv4();
const NON_EXISTENT_SPEAKER_ID = uuidv4();

const SPEAKER_1 = {
    speakerId: SPEAKER_1_ID,
    name: "LeBron James",
    title: "Professional Basketball Player",
    bio: "The GOAT.",
    eventTitle: "How to Play Basketball Like Me",
    eventDescription: "A deep dive into the talent of LeBron James.",
    imgUrl: "https://example.com/lebron_james.jpg",
} satisfies SpeakerType;

const SPEAKER_2 = {
    speakerId: SPEAKER_2_ID,
    name: "Sam Altman",
    title: "ChatGPT Dude",
    bio: "Listen to the guy who ceo of chatgpt explain how chatgpt works.",
    eventTitle: "DIY ChatGPT",
    eventDescription: "Exploring the inner workings of ChatGPT.",
    imgUrl: "https://example.com/sam_altman.jpg",
} satisfies SpeakerType;

const NEW_SPEAKER_PAYLOAD_NO_ID = {
    name: "Tom and Jerry",
    title: "Cat and Mouse",
    bio: "Watch cat chase mouse.",
    eventTitle: "Tom and Jerry Grand Chase",
    eventDescription: "Watching a cat chase a mouse throughout the house.",
    imgUrl: "https://example.com/tom_and_jerry.jpg",
} satisfies Omit<SpeakerType, "speakerId">;

const NEW_SPEAKER_PAYLOAD_WITH_ID = {
    ...NEW_SPEAKER_PAYLOAD_NO_ID,
    speakerId: uuidv4(),
} satisfies SpeakerType;

const UPDATE_SPEAKER_PAYLOAD = {
    name: "LeBron Raymone James",
    title: "GOAT.",
    bio: SPEAKER_1.bio + " of everything",
    eventTitle: "How to Get Goated Like LeBron",
    eventDescription: SPEAKER_1.eventDescription + " and meet and greet",
    imgUrl: "https://example.com/lebron_james_updated.jpg",
} satisfies UpdateSpeakerType;

beforeEach(async () => {
    // Clear existing speakers
    await SupabaseDB.SPEAKERS.delete().neq(
        "speaker_id",
        "00000000-0000-0000-0000-000000000000"
    );

    // Insert test speakers
    await SupabaseDB.SPEAKERS.insert([
        {
            speaker_id: SPEAKER_1.speakerId,
            name: SPEAKER_1.name,
            title: SPEAKER_1.title,
            bio: SPEAKER_1.bio,
            event_title: SPEAKER_1.eventTitle,
            event_description: SPEAKER_1.eventDescription,
            img_url: SPEAKER_1.imgUrl,
        },
        {
            speaker_id: SPEAKER_2.speakerId,
            name: SPEAKER_2.name,
            title: SPEAKER_2.title,
            bio: SPEAKER_2.bio,
            event_title: SPEAKER_2.eventTitle,
            event_description: SPEAKER_2.eventDescription,
            img_url: SPEAKER_2.imgUrl,
        },
    ]);
});

describe("GET /speakers/", () => {
    it("should return all speakers when speakers exist", async () => {
        const response = await get("/speakers/").expect(StatusCodes.OK);
        expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining(SPEAKER_1),
                expect.objectContaining(SPEAKER_2),
            ])
        );
    });

    it("should return an empty array when no speakers exist", async () => {
        await SupabaseDB.SPEAKERS.delete().neq(
            "speaker_id",
            "00000000-0000-0000-0000-000000000000"
        );
        const response = await get("/speakers/").expect(StatusCodes.OK);
        expect(response.body).toEqual([]);
    });
});

describe("GET /speakers/:SPEAKERID", () => {
    it("should return a specific speaker when a valid speakerId is provided", async () => {
        const response = await get(`/speakers/${SPEAKER_1.speakerId}`).expect(
            StatusCodes.OK
        );
        expect(response.body).toMatchObject(SPEAKER_1);
    });

    it("should return NOT_FOUND when speakerId does not exist", async () => {
        const response = await get(
            `/speakers/${NON_EXISTENT_SPEAKER_ID}`
        ).expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "DoesNotExist" });
    });
});

describe("POST /speakers/", () => {
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await post("/speakers/")
            .send(NEW_SPEAKER_PAYLOAD_NO_ID)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should create and return a new speaker with auto-generated speakerId when speakerId is not provided in payload", async () => {
        const response = await postAsAdmin("/speakers/")
            .send(NEW_SPEAKER_PAYLOAD_NO_ID)
            .expect(StatusCodes.CREATED);

        expect(response.body).toMatchObject({
            ...NEW_SPEAKER_PAYLOAD_NO_ID,
            speakerId: response.body.speakerId,
        });

        expect(response.body.speakerId).toMatch(
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
        );

        // Verify the speaker was actually created by attempting to fetch it
        const createdSpeakerResponse = await get(
            `/speakers/${response.body.speakerId}`
        ).expect(StatusCodes.OK);

        expect(createdSpeakerResponse.body).toMatchObject({
            ...NEW_SPEAKER_PAYLOAD_NO_ID,
            speakerId: response.body.speakerId,
        });
    });

    it("should create and return a new speaker with provided speakerId when valid speakerId is in payload", async () => {
        const response = await postAsAdmin("/speakers/")
            .send(NEW_SPEAKER_PAYLOAD_WITH_ID)
            .expect(StatusCodes.CREATED);

        expect(response.body).toMatchObject(NEW_SPEAKER_PAYLOAD_WITH_ID);

        const createdSpeakerResponse = await get(
            `/speakers/${response.body.speakerId}`
        ).expect(StatusCodes.OK);

        expect(createdSpeakerResponse.body).toMatchObject(
            NEW_SPEAKER_PAYLOAD_WITH_ID
        );
    });

    it("should return BAD_REQUEST if trying to create a speaker with an already existing speakerId", async () => {
        const payloadWithExistingId = {
            ...NEW_SPEAKER_PAYLOAD_NO_ID,
            speakerId: SPEAKER_1_ID,
        };

        const response = await postAsStaff("/speakers/")
            .send(payloadWithExistingId)
            .expect(StatusCodes.BAD_REQUEST);
        expect(response.body).toEqual({ error: "UserAlreadyExists" });
    });

    it.each([
        {
            description: "missing 'name' field",
            payload: { ...NEW_SPEAKER_PAYLOAD_NO_ID, name: undefined },
        },
        {
            description: "'name' field is not a string",
            payload: { ...NEW_SPEAKER_PAYLOAD_NO_ID, name: 12345 },
        },
        { description: "payload is an empty object", payload: {} },
    ])(
        "should return BAD_REQUEST when $description in an invalid payload",
        async ({ payload: invalidData }) => {
            await postAsStaff("/speakers/")
                .send(invalidData)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );
});

describe("PUT /speakers/:SPEAKERID", () => {
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await put(`/speakers/${SPEAKER_1.speakerId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should update speaker and return 200 OK with updated speaker", async () => {
        const response = await putAsAdmin(`/speakers/${SPEAKER_1.speakerId}`)
            .send(UPDATE_SPEAKER_PAYLOAD)
            .expect(StatusCodes.OK);

        expect(response.body).toMatchObject({
            ...UPDATE_SPEAKER_PAYLOAD,
            speakerId: SPEAKER_1_ID,
        });

        // ensure speakerId was not overwritten
        expect(response.body.speakerId).toBe(SPEAKER_1_ID);

        const speakerAfterUpdateResponse = await get(
            `/speakers/${response.body.speakerId}`
        ).expect(StatusCodes.OK);

        expect(speakerAfterUpdateResponse.body).toMatchObject({
            ...UPDATE_SPEAKER_PAYLOAD,
            speakerId: SPEAKER_1_ID,
        });
    });

    it("should return 404 NOT_FOUND when trying to update a speaker that does not exist", async () => {
        const response = await putAsStaff(
            `/speakers/${NON_EXISTENT_SPEAKER_ID}`
        )
            .send(UPDATE_SPEAKER_PAYLOAD)
            .expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "DoesNotExist" });
    });

    it("should return BAD_REQUEST when speakerId is included in request body", async () => {
        const payloadWithSpeakerId = {
            ...UPDATE_SPEAKER_PAYLOAD,
            speakerId: uuidv4(),
        };

        await putAsAdmin(`/speakers/${SPEAKER_1.speakerId}`)
            .send(payloadWithSpeakerId)
            .expect(StatusCodes.BAD_REQUEST);
    });

    it.each([
        {
            description: "missing 'name' field",
            payload: { ...UPDATE_SPEAKER_PAYLOAD, name: undefined },
        },
        {
            description: "'title' field is not a string",
            payload: { ...UPDATE_SPEAKER_PAYLOAD, title: 12345 },
        },
        { description: "payload is an empty object", payload: {} },
    ])(
        "should return BAD_REQUEST when $description when trying to update an existing speaker",
        async ({ payload: invalidData }) => {
            await putAsAdmin(`/speakers/${SPEAKER_1_ID}`)
                .send(invalidData)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );
});

describe("DELETE /speakers/:SPEAKERID", () => {
    it("should return UNAUTHORIZED for an unauthenticated user", async () => {
        await del(`/speakers/${SPEAKER_1.speakerId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should delete an existing speaker and return 204 NO_CONTENT for an ADMIN user", async () => {
        await delAsAdmin(`/speakers/${SPEAKER_1.speakerId}`).expect(
            StatusCodes.NO_CONTENT
        );

        const deletedSpeakerResponse = await get(
            `/speakers/${SPEAKER_1.speakerId}`
        ).expect(StatusCodes.NOT_FOUND);
        expect(deletedSpeakerResponse.body).toEqual({ error: "DoesNotExist" });
    });

    it("should delete an existing speaker and return 204 NO_CONTENT for a STAFF user", async () => {
        await delAsStaff(`/speakers/${SPEAKER_1.speakerId}`).expect(
            StatusCodes.NO_CONTENT
        );

        const deletedSpeakerResponse = await get(
            `/speakers/${SPEAKER_1.speakerId}`
        ).expect(StatusCodes.NOT_FOUND);
        expect(deletedSpeakerResponse.body).toEqual({ error: "DoesNotExist" });
    });

    it("should return NOT_FOUND when trying to delete a speaker that doesn't exist", async () => {
        const response = await delAsStaff(
            `/speakers/${NON_EXISTENT_SPEAKER_ID}`
        ).expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "DoesNotExist" });
    });
});
