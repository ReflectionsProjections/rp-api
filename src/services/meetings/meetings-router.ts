import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    meetingView,
    createMeetingValidator,
    updateMeetingValidator,
} from "./meetings-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { SupabaseDB } from "../../database";
import { MeetingType } from "./meetings-schema";

const meetingsRouter = Router();

/**
 * @swagger
 * /meetings/:
 *   get:
 *     summary: Get all meetings
 *     description: |
 *       Returns a list of all scheduled committee meetings.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Meetings]
 *     responses:
 *       200:
 *         description: A list of all meetings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MeetingView'
 *     security:
 *       - bearerAuth: []
 */
meetingsRouter.get(
    "/",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res) => {
        const { data: meetings } =
            await SupabaseDB.MEETINGS.select("*").throwOnError();

        const responseMeetings = meetings.map((meeting: MeetingType) =>
            meetingView.parse(meeting)
        );

        res.status(StatusCodes.OK).json(responseMeetings);
    }
);

/**
 * @swagger
 * /meetings/{meetingId}:
 *   get:
 *     summary: Get a meeting by ID
 *     description: |
 *       Returns a single meeting by its ID.
 *
 *       **Required roles: STAFF | ADMIN**
 *     tags: [Meetings]
 *     parameters:
 *       - name: meetingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The requested meeting
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeetingView'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   message: "Meeting not found"
 *     security:
 *       - bearerAuth: []
 */
meetingsRouter.get(
    "/:meetingId",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res) => {
        const { data: meeting } = await SupabaseDB.MEETINGS.select()
            .eq("meetingId", req.params.meetingId)
            .maybeSingle()
            .throwOnError();

        if (!meeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        const responseMeeting = meetingView.parse(meeting);

        res.status(StatusCodes.OK).json(responseMeeting);
    }
);

/**
 * @swagger
 * /meetings/:
 *   post:
 *     summary: Create a meeting
 *     description: |
 *       Creates a new committee meeting.
 *
 *       **Required roles: ADMIN**
 *     tags: [Meetings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMeetingValidator'
 *     responses:
 *       201:
 *         description: The newly created meeting
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeetingView'
 *     security:
 *       - bearerAuth: []
 */
meetingsRouter.post("/", RoleChecker([Role.enum.ADMIN]), async (req, res) => {
    const validatedData = createMeetingValidator.parse(req.body);

    const { data: newMeeting } = await SupabaseDB.MEETINGS.insert([
        {
            committeeType: validatedData.committeeType,
            startTime: validatedData.startTime.toISOString(),
        },
    ])
        .select()
        .single()
        .throwOnError();

    const responseMeeting = meetingView.parse(newMeeting);

    res.status(StatusCodes.CREATED).json(responseMeeting);
});

/**
 * @swagger
 * /meetings/{meetingId}:
 *   put:
 *     summary: Update a meeting
 *     description: |
 *       Updates one or more fields of an existing meeting.
 *
 *       **Required roles: ADMIN**
 *     tags: [Meetings]
 *     parameters:
 *       - name: meetingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMeetingValidator'
 *     responses:
 *       200:
 *         description: The updated meeting
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeetingView'
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   message: "Meeting not found"
 *     security:
 *       - bearerAuth: []
 */
meetingsRouter.put(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const validatedData = updateMeetingValidator.parse(req.body);

        const { data: updatedMeeting } = await SupabaseDB.MEETINGS.update({
            committeeType: validatedData.committeeType,
            startTime: validatedData.startTime?.toISOString(),
        })
            .eq("meetingId", req.params.meetingId)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!updatedMeeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        const responseMeeting = meetingView.parse(updatedMeeting);

        res.status(StatusCodes.OK).json(responseMeeting);
    }
);

/**
 * @swagger
 * /meetings/{meetingId}:
 *   delete:
 *     summary: Delete a meeting
 *     description: |
 *       Deletes a meeting by its ID.
 *
 *       **Required roles: ADMIN**
 *     tags: [Meetings]
 *     parameters:
 *       - name: meetingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Meeting successfully deleted
 *       404:
 *         description: Meeting not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *                 example:
 *                   message: "Meeting not found"
 *     security:
 *       - bearerAuth: []
 */
meetingsRouter.delete(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { data: deletedMeeting } = await SupabaseDB.MEETINGS.delete()
            .eq("meetingId", req.params.meetingId)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!deletedMeeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        res.status(StatusCodes.NO_CONTENT).send();
    }
);

export default meetingsRouter;
