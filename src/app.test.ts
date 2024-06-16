import { describe, expect, it } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { Database } from "./database";
import { publicEventValidator } from "./services/events/events-schema";
import { get } from "../testing/testingTools";

describe("general app test", () => {
    it("app should be running", async () => {
        const response = await get("/status", undefined).expect(StatusCodes.OK);

        expect(response.text).toBe("API is alive!");
    });
});

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
    eventType: "B",
};

describe("general mongodb test", () => {
    it("mongodb should work", async () => {
        const postEvent = await Database.EVENTS.create(
            publicEventValidator.parse(TESTER_EVENT)
        );
        const getEvent = await Database.EVENTS.findOne({ eventId: "b" });
        expect(postEvent.toObject()).toEqual(getEvent?.toObject());
    });
});
