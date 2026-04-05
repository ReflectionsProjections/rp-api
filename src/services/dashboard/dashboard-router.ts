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

/**
 * @swagger
 * /dashboard/:
 *   get:
 *     summary: Get all connected displays
 *     description: |
 *       Returns metadata for all currently connected dashboard displays.
 *
 *       **Required roles: ADMIN**
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: List of connected displays
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DisplaySchema'
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /dashboard/identify:
 *   post:
 *     summary: Broadcast identify message to all displays
 *     description: |
 *       Sends each display its own numeric ID so it can render it on screen.
 *
 *       **Required roles: ADMIN**
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: IDs of all displays the message was sent to
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSentToResponse'
 *     security:
 *       - bearerAuth: []
 */
dashboardRouter.post(
    "/identify",
    RoleChecker([Role.Enum.ADMIN]),
    send((id) => ({
        type: "message",
        message: id.toString(),
    }))
);
/**
 * @swagger
 * /dashboard/identify/{id}:
 *   post:
 *     summary: Send identify message to a specific display
 *     description: |
 *       Sends the specified display its numeric ID so it can render it on screen.
 *
 *       **Required roles: ADMIN**
 *     tags: [Dashboard]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ID of the display the message was sent to
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSentToResponse'
 *       404:
 *         description: No display found with the given ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "NotFound"
 *     security:
 *       - bearerAuth: []
 */
dashboardRouter.post(
    "/identify/:id",
    RoleChecker([Role.Enum.ADMIN]),
    send((id) => ({
        type: "message",
        message: id.toString(),
    }))
);

/**
 * @swagger
 * /dashboard/reload:
 *   post:
 *     summary: Broadcast reload to all displays
 *     description: |
 *       Instructs all connected displays to reload.
 *
 *       **Required roles: ADMIN**
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: IDs of all displays that were reloaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSentToResponse'
 *     security:
 *       - bearerAuth: []
 */
dashboardRouter.post(
    "/reload",
    RoleChecker([Role.Enum.ADMIN]),
    send({ type: "reload" })
);
/**
 * @swagger
 * /dashboard/reload/{id}:
 *   post:
 *     summary: Reload a specific display
 *     description: |
 *       Instructs the specified display to reload.
 *
 *       **Required roles: ADMIN**
 *     tags: [Dashboard]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ID of the display that was reloaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSentToResponse'
 *       404:
 *         description: No display found with the given ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "NotFound"
 *     security:
 *       - bearerAuth: []
 */
dashboardRouter.post(
    "/reload/:id",
    RoleChecker([Role.Enum.ADMIN]),
    send({ type: "reload" })
);

/**
 * @swagger
 * /dashboard/message:
 *   post:
 *     summary: Broadcast a message to all displays
 *     description: |
 *       Sends a text message or URL to all connected displays.
 *
 *       **Required roles: ADMIN**
 *     tags: [Dashboard]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DashboardMessageValidator'
 *     responses:
 *       200:
 *         description: IDs of all displays the message was sent to
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSentToResponse'
 *     security:
 *       - bearerAuth: []
 */
dashboardRouter.post("/message", RoleChecker([Role.Enum.ADMIN]), (req, res) => {
    const message = DashboardMessageValidator.parse(req.body);
    return send({
        type: "message",
        ...message,
    })(req, res);
});
/**
 * @swagger
 * /dashboard/message/{id}:
 *   post:
 *     summary: Send a message to a specific display
 *     description: |
 *       Sends a text message or URL to the specified display.
 *
 *       **Required roles: ADMIN**
 *     tags: [Dashboard]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DashboardMessageValidator'
 *     responses:
 *       200:
 *         description: ID of the display the message was sent to
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSentToResponse'
 *       404:
 *         description: No display found with the given ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   error: "NotFound"
 *     security:
 *       - bearerAuth: []
 */
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
