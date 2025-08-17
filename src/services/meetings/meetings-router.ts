import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    meetingView,
    createMeetingValidator,
    updateMeetingValidator,
} from "./meetings-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { SupabaseDB } from "../../supabase";
import { MeetingSchema } from "./meetings-schema";

const meetingsRouter = Router();

meetingsRouter.get(
    "/",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res) => {
        const { data: meetings } =
            await SupabaseDB.MEETINGS.select("*").throwOnError();

        const responseMeetings = meetings.map((meeting: typeof MeetingSchema) =>
            meetingView.parse(meeting)
        );

        res.status(StatusCodes.OK).json(responseMeetings);
    }
);

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
