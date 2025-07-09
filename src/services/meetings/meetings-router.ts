import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { meetingView, createMeetingValidator, updateMeetingValidator } from "./meetings-schema";
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";
import { SupabaseDB } from "../../supabase";

const meetingsRouter = Router();

meetingsRouter.get(
    "/",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res) => {
        const { data: meetings } = await SupabaseDB.MEETINGS.select("*").throwOnError();
        
        const responseMeetings = meetings.map((meeting) =>
            meetingView.parse({
                meetingId: meeting.meeting_id,
                committeeType: meeting.committee_type,
                startTime: meeting.start_time,
            })
        );
        
        res.status(StatusCodes.OK).json(responseMeetings);
    }
);

meetingsRouter.get(
    "/:meetingId",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res) => {
        const { data: meeting } = await SupabaseDB.MEETINGS.select()
            .eq("meeting_id", req.params.meetingId)
            .maybeSingle()
            .throwOnError();

        if (!meeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        const responseMeeting = meetingView.parse({
            meetingId: meeting.meeting_id,
            committeeType: meeting.committee_type,
            startTime: meeting.start_time,
        });

        res.status(StatusCodes.OK).json(responseMeeting);
    }
);

meetingsRouter.post(
    "/",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const validatedData = createMeetingValidator.parse(req.body);

        const { data: newMeeting } = await SupabaseDB.MEETINGS.insert([
            {
                committee_type: validatedData.committeeType,
                start_time: validatedData.startTime,
            },
        ])
            .select()
            .single()
            .throwOnError();

        const responseMeeting = meetingView.parse({
            meetingId: newMeeting.meeting_id,
            committeeType: newMeeting.committee_type,
            startTime: newMeeting.start_time,
        });

        res.status(StatusCodes.CREATED).json(responseMeeting);
    }
);

meetingsRouter.put(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const validatedData = updateMeetingValidator.parse(req.body);
        
        const { data: updatedMeeting } = await SupabaseDB.MEETINGS.update({
            committee_type: validatedData.committeeType,
            start_time: validatedData.startTime,
        })
            .eq("meeting_id", req.params.meetingId)
            .select()
            .maybeSingle()
            .throwOnError();

        if (!updatedMeeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        const responseMeeting = meetingView.parse({
            meetingId: updatedMeeting.meeting_id,
            committeeType: updatedMeeting.committee_type,
            startTime: updatedMeeting.start_time,
        });

        res.status(StatusCodes.OK).json(responseMeeting);
    }
);

meetingsRouter.delete(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res) => {
        const { data: deletedMeeting } = await SupabaseDB.MEETINGS.delete()
            .eq("meeting_id", req.params.meetingId)
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
