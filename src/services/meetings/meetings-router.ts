import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    getAllMeetings,
    getMeetingById,
    createMeeting,
    updateMeeting,
    deleteMeeting,
} from "./meetings-util";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

const meetingsRouter = Router();

meetingsRouter.get(
    "/",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res, next) => {
        try {
            const meetings = await getAllMeetings();
            res.status(StatusCodes.OK).json(meetings);
        } catch (error) {
            next(error);
        }
    }
);

// get specific event
meetingsRouter.get(
    "/:meetingId",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res, next) => {
        try {
            const meeting = await getMeetingById(req.params.meetingId);
            if (!meeting) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ message: "Meeting not found" });
            }
            res.status(StatusCodes.OK).json(meeting);
        } catch (error) {
            next(error);
        }
    }
);

// create an event
meetingsRouter.post(
    "/",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res, next) => {
        try {
            const meeting = await createMeeting(req.body);
            res.status(StatusCodes.CREATED).json(meeting);
        } catch (error) {
            next(error);
        }
    }
);

// edit a meeting, parameter is the ID ()
meetingsRouter.put(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res, next) => {
        try {
            const meeting = await updateMeeting(req.params.meetingId, req.body);
            if (!meeting) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ message: "Meeting not found" });
            }
            res.status(StatusCodes.OK).json(meeting);
        } catch (error) {
            next(error);
        }
    }
);

// delete a meeting, by meeting ID
meetingsRouter.delete(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res, next) => {
        try {
            const deleted = await deleteMeeting(req.params.meetingId);
            if (!deleted) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ message: "Meeting not found" });
            }
            res.status(StatusCodes.NO_CONTENT).send();
        } catch (error) {
            next(error);
        }
    }
);

export default meetingsRouter;
