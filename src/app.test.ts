import { describe, expect, it } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { Database } from "./database";
import { get } from "../testing/testingTools";

const TESTER_EVENT = {
    name: "Tech Conference Update",
    startTime: "2024-09-16T09:00:00.000Z",
    endTime: "2024-09-16T18:00:00.000Z",
    points: 55,
    description:
        "An updated schedule and additional speakers at our tech conference.",
    isVirtual: false,
    imageUrl: "http://example.com/newimage.jpg",
    isVisible: true,
    eventId: "b",
    attendanceCount: 0,
    eventType: "SPEAKER",
};

describe("general app test", () => {
    it("app should be running", async () => {
        const response = await get("/status", undefined).expect(StatusCodes.OK);
        expect(response.body).toMatchObject({
            ok: true,
            message: "API is alive!",
        });
    });
});

describe("general mongodb test", () => {
    it("in-memory mongodb server should work", async () => {
        const postEvent = await Database.EVENTS.create(TESTER_EVENT);

        const getEvent = await Database.EVENTS.findOne({ eventId: "b" });
        expect(getEvent).not.toBeNull();
        expect(postEvent!.toObject()).toMatchObject(getEvent!.toObject());
    });
});

describe("jest setup test", () => {
    it("creating an object in the db", async () => {
        await Database.EVENTS.create(TESTER_EVENT);
    });

    it("db should be empty", async () => {
        const events = await Database.EVENTS.find();
        expect(events.length).toEqual(0);
    });
});
