import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
    meetingView,
    createMeetingValidator,
    updateMeetingValidator,
} from "./meetings-schema";

//import { Database } from "../../database"; -> MongoDB database call
import RoleChecker from "../../middleware/role-checker";
import { Role } from "../auth/auth-models";

import { SupabaseDB } from "../../supabase"; // Supabase database

const meetingsRouter = Router();

// GET endpoints: get all meetings, get specific meeting
// POST endpoints: create a meeting
// PUT endpoints: edit a meeting
// DELETE endpoints: delete a meeting

// get all events
meetingsRouter.get(
    "/",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res, next) => {
        // const meetings = await Database.MEETINGS.find();
        // const parsedMeetings = meetings.map((meeting) =>
        //     meetingView.parse(meeting.toObject())
        // );
        // res.status(StatusCodes.OK).json(parsedMeetings);

        // ----------- SUPABASE ----------- //
        const { data: supabaseMeetings, error } =
            await SupabaseDB.MEETINGS.select("*");
        if (error) return next(error);

        const supabaseParsedMeetings = supabaseMeetings.map((m) =>
            meetingView.parse({
                meetingId: m.meeting_id,
                committeeType: m.committee_type,
                startTime: m.start_time,
            })
        );
        res.status(StatusCodes.OK).json(supabaseParsedMeetings);
    }
);

// get specific event
meetingsRouter.get(
    "/:meetingId",
    RoleChecker([Role.enum.STAFF, Role.enum.ADMIN]),
    async (req, res, next) => {
        const { meetingId } = req.params;
        // const meeting = await Database.MEETINGS.findOne({ meetingId });

        // if (!meeting) {
        //     return res
        //         .status(StatusCodes.NOT_FOUND)
        //         .json({ message: "Meeting not found" });
        // }

        // const parsedMeeting = meetingView.parse(meeting.toObject());
        // res.status(StatusCodes.OK).json(parsedMeeting);

        // ----------- SUPABASE ----------- //
        const { data: supabaseMeeting, error } =
            await SupabaseDB.MEETINGS.select().eq("meeting_id", meetingId);

        if (error) return next(error);
        if (!supabaseMeeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        const supabaseParsedMeetings = supabaseMeeting.map((m) =>
            meetingView.parse({
                meetingId: m.meeting_id,
                committeeType: m.committee_type,
                startTime: m.start_time,
            })
        );
        res.status(StatusCodes.OK).json(supabaseParsedMeetings);
    }
);

// create an event
meetingsRouter.post(
    "/",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res, next) => {
        const validatedData = createMeetingValidator.parse(req.body);
        // const newMeeting = new Database.MEETINGS(validatedData);
        // await newMeeting.save();

        // const parsedMeeting = meetingView.parse(newMeeting.toObject());

        // ----------- SUPABASE ----------- //
        // Supabase call
        const { data: supabaseMeeting, error } =
            await SupabaseDB.MEETINGS.insert([
                {
                    committee_type: validatedData.committeeType,
                    start_time: validatedData.startTime,
                },
            ]).select();

        // error handling
        if (error) return next(error);

        // return parsed meeting
        const supabaseParsedMeeting = meetingView.parse({
            meetingId: supabaseMeeting[0].meeting_id,
            committeeType: supabaseMeeting[0].committee_type,
            startTime: supabaseMeeting[0].start_time,
        });
        res.status(StatusCodes.CREATED).json(supabaseParsedMeeting);
    }
);

// edit a meeting, parameter is the ID
meetingsRouter.put(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res, next) => {
        const { meetingId } = req.params;
        const parsedData = updateMeetingValidator.parse(req.body);

        // const updatedMeeting = await Database.MEETINGS.findOneAndUpdate(
        //     { meetingId },
        //     parsedData,
        //     { new: true }
        // );

        // if (!updatedMeeting) {
        //     return res
        //         .status(StatusCodes.NOT_FOUND)
        //         .json({ message: "Meeting not found" });
        // }
        // ----------- SUPABASE ----------- //

        // Supabase call
        const { data: updatedMeeting, error } =
            await SupabaseDB.MEETINGS.update({
                ...(parsedData.committeeType && {
                    committee_type: parsedData.committeeType,
                }),
                ...(parsedData.startTime && {
                    start_time: parsedData.startTime,
                }),
            })
                .eq("meeting_id", meetingId)
                .select()
                .single();

        // error handling
        if (error) return next(error);
        if (!updatedMeeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        // return parsed meeting
        const parsedMeeting = meetingView.parse({
            meetingId: updatedMeeting.meeting_id,
            committeeType: updatedMeeting.committee_type,
            startTime: updatedMeeting.start_time,
        });
        res.status(StatusCodes.OK).json(parsedMeeting);
    }
);

// delete a meeting, by meeting ID

meetingsRouter.delete(
    "/:meetingId",
    RoleChecker([Role.enum.ADMIN]),
    async (req, res, next) => {
        const { meetingId } = req.params;
        // const deletedMeeting = await Database.MEETINGS.findOneAndDelete({
        //     meetingId,
        // });

        // ----------- SUPABASE ----------- //
        // Supabase call
        const { data: deletedMeeting, error } =
            await SupabaseDB.MEETINGS.delete()
                .eq("meeting_id", meetingId)
                .select()
                .single();

        // error handling
        if (error) return next(error);
        if (!deletedMeeting) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ message: "Meeting not found" });
        }

        // return 204
        res.status(StatusCodes.NO_CONTENT).send(); // 204 No Content on successful deletion
    }
);

export default meetingsRouter;
