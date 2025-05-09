import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    meetingView,
    createMeetingValidator,
    updateMeetingValidator,
} from "./meetings-schema";

import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const meetingsRouter = Router();

// GET endpoints: get all meetings, get specific meeting
// POST endpoints: create a meeting
// PUT endpoints: edit a meeting
// DELETE endpoints: delete a meeting

// get all events
meetingsRouter.get(
    "/",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res) => {
        const meetings = await Database.MEETINGS.find();
        const parsedMeetings = meetings.map((meeting) =>
            meetingView.parse(meeting.toObject())
        );
        res.status(StatusCodes.OK).json(parsedMeetings);
    }
);

// get specific event
meetingsRouter.get(
    "/:meetingId",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res) => {
        const { meetingId } = req.params;
        const meeting = await Database.MEETINGS.findOne({ meetingId });

        if (!meeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        const parsedMeeting = meetingView.parse(meeting.toObject());
        res.status(StatusCodes.OK).json(parsedMeeting);
    }
);

// create an event
meetingsRouter.post("/", RoleChecker([Role.enum.ADMIN]), async (req, res) => {
    const validatedData = createMeetingValidator.parse(req.body);
    const newMeeting = new Database.MEETINGS(validatedData);
    await newMeeting.save();

    const parsedMeeting = meetingView.parse(newMeeting.toObject());
    res.status(StatusCodes.CREATED).json(parsedMeeting);
});

// edit a meeting, parameter is the ID
meetingsRouter.put(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { meetingId } = req.params;
        const parsedData = updateMeetingValidator.parse(req.body);

        const updatedMeeting = await Database.MEETINGS.findOneAndUpdate(
            { meetingId },
            parsedData,
            { new: true }
        );

        if (!updatedMeeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        const parsedMeeting = meetingView.parse(updatedMeeting.toObject());
        res.status(StatusCodes.OK).json(parsedMeeting);
    }
);

// delete a meeting, by meeting ID

meetingsRouter.delete(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { meetingId } = req.params;
        const deletedMeeting = await Database.MEETINGS.findOneAndDelete({
            meetingId,
        });

        if (!deletedMeeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        res.status(StatusCodes.NO_CONTENT).send(); // 204 No Content on successful deletion
    }
);

export default meetingsRouter;
