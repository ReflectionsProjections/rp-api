import { beforeAll, describe } from "@jest/globals";
import { server } from "../../app";
import { DashboardMessage, DisplayMetadata } from "./dashboard-schema";
import {
    getAsAdmin,
    getAsStaff,
    postAsAdmin,
    postAsStaff,
} from "../../../testing/testingTools";
import TestWebSocket from "../../../testing/testWebSocket";
import { StatusCodes } from "http-status-codes";
import Config from "../../config";

const serverPort = 4000;
const wsBaseURL = `ws://localhost:${serverPort}`;
const DISPLAY_0_METADATA: DisplayMetadata = {
    screenWidth: 1920,
    screenHeight: 1080,
    devicePixelRatio: 1,
    platform: "Linux - I Use Arch btw",
    unixTime: Date.now(),
    userAgent: "BrowserIMadeMyselfSoItNeverRendersProperly/0.1.2",
};
const DISPLAY_1_METADATA: DisplayMetadata = {
    screenWidth: 3840,
    screenHeight: 2160,
    devicePixelRatio: 1,
    platform: "Windows",
    unixTime: Date.now(),
    userAgent: "Chrome/140.0.0.0 Windows NT/3",
};

const DASHBOARD_MESSAGE: DashboardMessage = {
    message: "test message",
};

const pingsInTimeout = Math.floor(
    Config.DASHBOARD_TIMEOUT_MS / Config.DASHBOARD_PING_EVERY_MS
);

Config.DASHBOARD_PING_EVERY_MS = 500;
Config.DASHBOARD_TIMEOUT_MS = Config.DASHBOARD_PING_EVERY_MS * pingsInTimeout;

function sleep(delay: number) {
    return new Promise((res) => setTimeout(res, delay));
}

beforeAll((done) => {
    server.listen(serverPort, () => {
        done();
    });
});

afterAll((done) => {
    server.close(done);
});

describe("ws /dashboard", () => {
    it("ws accepts good input", async () => {
        const ws = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws.start();
        ws.send(JSON.stringify(DISPLAY_0_METADATA));
        await sleep(Config.DASHBOARD_PING_EVERY_MS / 4);
        const result = await ws.close();
        expect(result).toEqual({
            code: 1005,
            received: [JSON.stringify({ type: "ping" })],
        });
    });
    it("ws rejects bad input", async () => {
        const ws = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws.start();
        ws.send("bad input");
        await sleep(Config.DASHBOARD_PING_EVERY_MS / 4);
        const result = await ws.close();
        expect(result).toEqual({
            code: 1008,
            received: [JSON.stringify({ type: "ping" }), "Invalid message"],
        });
    });
});

describe("GET /dashboard", () => {
    it("shows metadata of connected", async () => {
        const ws0 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        const ws1 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws0.start();
        ws0.send(JSON.stringify(DISPLAY_0_METADATA));
        await ws1.start();
        ws1.send(JSON.stringify(DISPLAY_1_METADATA));
        const result = await getAsAdmin("/dashboard").expect(StatusCodes.OK);
        const wsResults = await Promise.all([ws0.close(), ws1.close()]);

        expect(wsResults).toEqual([
            {
                code: 1005,
                received: [JSON.stringify({ type: "ping" })],
            },
            {
                code: 1005,
                received: [JSON.stringify({ type: "ping" })],
            },
        ]);
        expect(result.body).toEqual([
            {
                id: 0,
                metadata: DISPLAY_0_METADATA,
                lastUpdate: expect.any(Number),
            },
            {
                id: 1,
                metadata: DISPLAY_1_METADATA,
                lastUpdate: expect.any(Number),
            },
        ]);
    });

    it("removes metadata when display disconnected", async () => {
        const ws0 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        const ws1 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws0.start();
        ws0.send(JSON.stringify(DISPLAY_0_METADATA));
        await ws1.start();
        ws1.send(JSON.stringify(DISPLAY_1_METADATA));
        const ws0Result = await ws0.close();

        const result = await getAsAdmin("/dashboard").expect(StatusCodes.OK);
        const ws1Result = await ws1.close();

        expect(ws0Result).toEqual({
            code: 1005,
            received: [JSON.stringify({ type: "ping" })],
        });
        expect(ws1Result).toEqual({
            code: 1005,
            received: [JSON.stringify({ type: "ping" })],
        });
        expect(result.body).toEqual([
            {
                id: 1,
                metadata: DISPLAY_1_METADATA,
                lastUpdate: expect.any(Number),
            },
        ]);
    });

    it("removes metadata when display times out", async () => {
        const ws = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws.start();
        ws.send(JSON.stringify(DISPLAY_0_METADATA));
        await sleep(Config.DASHBOARD_PING_EVERY_MS);

        const beforeTimeoutResult = await getAsAdmin("/dashboard").expect(
            StatusCodes.OK
        );
        await sleep(Config.DASHBOARD_TIMEOUT_MS);
        const afterTimeoutResult = await getAsAdmin("/dashboard").expect(
            StatusCodes.OK
        );

        const wsResult = await ws.close();

        const received = [];
        for (let i = 0; i < pingsInTimeout + 1; i++) {
            received.push(JSON.stringify({ type: "ping" }));
        }

        expect(wsResult).toEqual({
            code: 1005,
            received,
        });
        expect(beforeTimeoutResult.body).toEqual([
            {
                id: 0,
                metadata: DISPLAY_0_METADATA,
                lastUpdate: expect.any(Number),
            },
        ]);
        expect(afterTimeoutResult.body).toEqual([]);
    });

    it("returns nothing if none connected", async () => {
        const res = await getAsAdmin("/dashboard").expect(StatusCodes.OK);
        expect(res.body).toEqual([]);
    });

    it("fails for non admin", async () => {
        const res = await getAsStaff("/dashboard").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toMatchObject({ error: "Forbidden" });
    });
});

describe("POST /dashboard/identify", () => {
    it("sends identify message to all displays", async () => {
        const ws0 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        const ws1 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws0.start();
        ws0.send(JSON.stringify(DISPLAY_0_METADATA));
        await ws1.start();
        ws1.send(JSON.stringify(DISPLAY_1_METADATA));

        const res = await postAsAdmin("/dashboard/identify").expect(
            StatusCodes.OK
        );
        const wsResults = await Promise.all([ws0.close(), ws1.close()]);

        expect(wsResults).toEqual([
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "message", message: "0" }),
                ],
            },
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "message", message: "1" }),
                ],
            },
        ]);

        expect(res.body).toEqual({ sentTo: [0, 1] });
    });

    it("fails for non admin", async () => {
        const res = await postAsStaff("/dashboard/identify").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toMatchObject({ error: "Forbidden" });
    });
});

describe("POST /dashboard/identify/:id", () => {
    it("sends identify message to specified display", async () => {
        const ws0 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        const ws1 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws0.start();
        ws0.send(JSON.stringify(DISPLAY_0_METADATA));
        await ws1.start();
        ws1.send(JSON.stringify(DISPLAY_1_METADATA));

        const res = await postAsAdmin("/dashboard/identify/1").expect(
            StatusCodes.OK
        );
        const wsResults = await Promise.all([ws0.close(), ws1.close()]);

        expect(wsResults).toEqual([
            {
                code: 1005,
                received: [JSON.stringify({ type: "ping" })],
            },
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "message", message: "1" }),
                ],
            },
        ]);

        expect(res.body).toEqual({ sentTo: [1] });
    });

    it("fails if the display is not found", async () => {
        const ws = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws.start();
        ws.send(JSON.stringify(DISPLAY_0_METADATA));

        const result = await postAsAdmin("/dashboard/identify/2").expect(
            StatusCodes.NOT_FOUND
        );

        const wsResult = await ws.close();

        expect(wsResult).toEqual({
            code: 1005,
            received: [JSON.stringify({ type: "ping" })],
        });

        expect(result.body).toMatchObject({ error: "NotFound" });
    });

    it("fails for non admin", async () => {
        const res = await postAsStaff("/dashboard/identify/1").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toMatchObject({ error: "Forbidden" });
    });
});

describe("POST /dashboard/reload", () => {
    it("sends reload message to all displays", async () => {
        const ws0 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        const ws1 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws0.start();
        ws0.send(JSON.stringify(DISPLAY_0_METADATA));
        await ws1.start();
        ws1.send(JSON.stringify(DISPLAY_1_METADATA));

        const res = await postAsAdmin("/dashboard/reload").expect(
            StatusCodes.OK
        );
        const wsResults = await Promise.all([ws0.close(), ws1.close()]);

        expect(wsResults).toEqual([
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "reload" }),
                ],
            },
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "reload" }),
                ],
            },
        ]);

        expect(res.body).toEqual({ sentTo: [0, 1] });
    });

    it("fails for non admin", async () => {
        const res = await postAsStaff("/dashboard/reload").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toMatchObject({ error: "Forbidden" });
    });
});

describe("POST /dashboard/reload/:id", () => {
    it("sends reload message to specified display", async () => {
        const ws0 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        const ws1 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws0.start();
        ws0.send(JSON.stringify(DISPLAY_0_METADATA));
        await ws1.start();
        ws1.send(JSON.stringify(DISPLAY_1_METADATA));

        const res = await postAsAdmin("/dashboard/reload/1").expect(
            StatusCodes.OK
        );
        const wsResults = await Promise.all([ws0.close(), ws1.close()]);

        expect(wsResults).toEqual([
            {
                code: 1005,
                received: [JSON.stringify({ type: "ping" })],
            },
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "reload" }),
                ],
            },
        ]);

        expect(res.body).toEqual({ sentTo: [1] });
    });

    it("fails if the display is not found", async () => {
        const ws = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws.start();
        ws.send(JSON.stringify(DISPLAY_0_METADATA));

        const result = await postAsAdmin("/dashboard/reload/2").expect(
            StatusCodes.NOT_FOUND
        );

        const wsResult = await ws.close();

        expect(wsResult).toEqual({
            code: 1005,
            received: [JSON.stringify({ type: "ping" })],
        });

        expect(result.body).toMatchObject({ error: "NotFound" });
    });

    it("fails for non admin", async () => {
        const res = await postAsStaff("/dashboard/reload/1").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toMatchObject({ error: "Forbidden" });
    });
});

describe("POST /dashboard/message", () => {
    it("sends a message to all displays", async () => {
        const ws0 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        const ws1 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws0.start();
        ws0.send(JSON.stringify(DISPLAY_0_METADATA));
        await ws1.start();
        ws1.send(JSON.stringify(DISPLAY_1_METADATA));

        const res = await postAsAdmin("/dashboard/message")
            .send(DASHBOARD_MESSAGE)
            .expect(StatusCodes.OK);
        const wsResults = await Promise.all([ws0.close(), ws1.close()]);

        expect(wsResults).toEqual([
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "message", ...DASHBOARD_MESSAGE }),
                ],
            },
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "message", ...DASHBOARD_MESSAGE }),
                ],
            },
        ]);

        expect(res.body).toEqual({ sentTo: [0, 1] });
    });

    it("fails for invalid payload", async () => {
        const result = await postAsAdmin("/dashboard/message")
            .send({ invalid: "whatever" })
            .expect(StatusCodes.BAD_REQUEST);

        expect(result.body).toMatchObject({ error: "BadRequest" });
    });

    it("fails for non admin", async () => {
        const res = await postAsStaff("/dashboard/message").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toMatchObject({ error: "Forbidden" });
    });
});

describe("POST /dashboard/message/:id", () => {
    it("sends a message to specified display", async () => {
        const ws0 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        const ws1 = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws0.start();
        ws0.send(JSON.stringify(DISPLAY_0_METADATA));
        await ws1.start();
        ws1.send(JSON.stringify(DISPLAY_1_METADATA));

        const res = await postAsAdmin("/dashboard/message/1")
            .send(DASHBOARD_MESSAGE)
            .expect(StatusCodes.OK);
        const wsResults = await Promise.all([ws0.close(), ws1.close()]);

        expect(wsResults).toEqual([
            {
                code: 1005,
                received: [JSON.stringify({ type: "ping" })],
            },
            {
                code: 1005,
                received: [
                    JSON.stringify({ type: "ping" }),
                    JSON.stringify({ type: "message", ...DASHBOARD_MESSAGE }),
                ],
            },
        ]);

        expect(res.body).toEqual({ sentTo: [1] });
    });

    it("fails if the display is not found", async () => {
        const ws = new TestWebSocket(`${wsBaseURL}/dashboard`);
        await ws.start();
        ws.send(JSON.stringify(DISPLAY_0_METADATA));

        const result = await postAsAdmin("/dashboard/message/2")
            .send(DASHBOARD_MESSAGE)
            .expect(StatusCodes.NOT_FOUND);

        const wsResult = await ws.close();

        expect(wsResult).toEqual({
            code: 1005,
            received: [JSON.stringify({ type: "ping" })],
        });

        expect(result.body).toMatchObject({ error: "NotFound" });
    });

    it("fails for invalid payload", async () => {
        const result = await postAsAdmin("/dashboard/message/0")
            .send({ invalid: "whatever" })
            .expect(StatusCodes.BAD_REQUEST);

        expect(result.body).toMatchObject({ error: "BadRequest" });
    });

    it("fails for non admin", async () => {
        const res = await postAsStaff("/dashboard/message/1").expect(
            StatusCodes.FORBIDDEN
        );
        expect(res.body).toMatchObject({ error: "Forbidden" });
    });
});
