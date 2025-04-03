import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { meetingView, meetingValidator } from "./meetings-schema";

import { Database } from "../../database";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const meetingsRouter = Router();

// GET endpoints: get all meetings, get specific meeting
// POST endpoints: create a meeting
// PUT endpoints: edit a meeting
// DELETE endpoints: delete a meeting

// For the endpoints, I should probably add role checking
// Just not sure if we've set up roles yet, so I'll keep that as a todo
// @todo add actual role checking

// get all events
meetingsRouter.get("/", RoleChecker([Role.enum.STAFF, Role.enum.ADMIN], true), async (req, res, next) => {
    try {
        const meetings = await Database.MEETINGS.find();
        const parsedMeetings = meetings.map((meeting) =>
            meetingView.parse(meeting.toObject())
        );
        res.status(StatusCodes.OK).json(parsedMeetings);
    } catch (error) {
        next(error);
    }
});

// get specific event
meetingsRouter.get("/:meetingId", RoleChecker([Role.enum.STAFF, Role.enum.ADMIN], true), async (req, res, next) => {
    try {
        const { meetingId } = req.params;
        const meeting = await Database.MEETINGS.findOne({ meetingId });

        if (!meeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        const parsedMeeting = meetingView.parse(meeting.toObject());
        res.status(StatusCodes.OK).json(parsedMeeting);
    } catch (error) {
        next(error);
    }
});

// create an event
meetingsRouter.post("/", RoleChecker([Role.enum.ADMIN], true), async (req, res, next) => {
    try {
        const validatedData = meetingValidator.parse(req.body);
        const newMeeting = new Database.MEETINGS(validatedData);
        await newMeeting.save();

        const parsedMeeting = meetingView.parse(newMeeting.toObject());
        res.status(StatusCodes.CREATED).json(parsedMeeting);
    } catch (error) {
        next(error);
    }
});

// edit a meeting, parameter is the ID
meetingsRouter.put("/:meetingId", RoleChecker([Role.enum.ADMIN], true), async (req, res, next) => {
    try {
        const { meetingId } = req.params;
        const parsedData = meetingValidator.partial().parse(req.body);

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
    } catch (error) {
        next(error);
    }
});

// delete a meeting, by meeting ID

meetingsRouter.delete("/:meetingId", RoleChecker([Role.enum.ADMIN], true), async (req, res, next) => {
    try {
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
    } catch (error) {
        next(error);
    }
});

export default meetingsRouter;
