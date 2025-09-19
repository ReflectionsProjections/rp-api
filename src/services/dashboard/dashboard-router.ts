import express, { Request, Response } from "express";
import { WebSocket } from "ws";
import {
    DashboardMessageValidator,
    Display,
    DisplayId,
    DisplayMetadataSchema,
} from "./dashboard-schema";
import Config from "../../config";
import { StatusCodes } from "http-status-codes";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const dashboardRouter = express.Router();
const displays: Display[] = [];
const websockets: WebSocket[] = [];

function findFirstFreeId(): number {
    const foundFree = displays.findIndex((d) => !d);
    if (foundFree == -1) {
        return displays.length;
    }

    return foundFree;
}

// Handle an incoming websocket connection
export function handleWs(ws: WebSocket) {
    const id = findFirstFreeId();
    websockets[id] = ws;
    const display: Display = {
        id,
        lastUpdate: Date.now(),
    };
    displays[id] = display;

    ws.on("message", (message) => {
        try {
            display.lastUpdate = Date.now();
            const json = JSON.parse(message.toString());
            const metadata = DisplayMetadataSchema.parse(json);
            display.metadata = metadata;
        } catch {
            ws.send("Invalid message");
            ws.close(1008); // 1008 = policy violation
        }
    });

    function pingForUpdate() {
        const sinceLastUpdate = Date.now() - display.lastUpdate;
        if (sinceLastUpdate >= Config.DASHBOARD_TIMEOUT_MS) {
            ws.close();
            return;
        }

        ws.send(
            JSON.stringify({
                type: "ping",
            })
        );
    }

    const interval = setInterval(pingForUpdate, Config.DASHBOARD_PING_EVERY_MS);

    ws.on("close", () => {
        clearInterval(interval);
        delete displays[id];
        delete websockets[id];
    });

    pingForUpdate();
}

dashboardRouter.get("/", RoleChecker([Role.Enum.ADMIN]), (req, res) => {
    // Displays can contain gaps - this endpoint just returns each display
    const displaysWithoutSpaces = displays.filter((display) => display);
    return res.status(StatusCodes.OK).send(displaysWithoutSpaces);
});

function send(message: object | ((id: number) => object)) {
    return (req: Request, res: Response) => {
        const target =
            "id" in req.params ? DisplayId.parse(req.params["id"]) : undefined;
        if (target !== undefined) {
            const ws = websockets[target];
            if (!ws) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .send({ error: "NotFound" });
            }

            const toSend =
                typeof message === "object" ? message : message(target);
            ws.send(JSON.stringify(toSend));

            return res.status(StatusCodes.OK).send({ sentTo: [target] });
        }

        const sentTo = [];
        for (const [i, ws] of websockets.entries()) {
            if (!ws) continue;
            const toSend = typeof message === "object" ? message : message(i);
            sentTo.push(i);
            ws.send(JSON.stringify(toSend));
        }

        return res.status(StatusCodes.OK).send({ sentTo });
    };
}

dashboardRouter.post(
    "/identify",
    RoleChecker([Role.Enum.ADMIN]),
    send((id) => ({
        type: "message",
        message: id.toString(),
    }))
);
dashboardRouter.post(
    "/identify/:id",
    RoleChecker([Role.Enum.ADMIN]),
    send((id) => ({
        type: "message",
        message: id.toString(),
    }))
);

dashboardRouter.post(
    "/reload",
    RoleChecker([Role.Enum.ADMIN]),
    send({ type: "reload" })
);
dashboardRouter.post(
    "/reload/:id",
    RoleChecker([Role.Enum.ADMIN]),
    send({ type: "reload" })
);

dashboardRouter.post("/message", RoleChecker([Role.Enum.ADMIN]), (req, res) => {
    const message = DashboardMessageValidator.parse(req.body);
    return send({
        type: "message",
        ...message,
    })(req, res);
});
dashboardRouter.post(
    "/message/:id",
    RoleChecker([Role.Enum.ADMIN]),
    (req, res) => {
        const message = DashboardMessageValidator.parse(req.body);
        return send({
            type: "message",
            ...message,
        })(req, res);
    }
);

export default dashboardRouter;
