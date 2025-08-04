import { SupabaseDB } from "../../supabase"; // Supabase database
import {
    meetingView,
    createMeetingValidator,
    updateMeetingValidator,
} from "./meetings-schema";
import { z } from "zod";

export const getAllMeetings = async () => {
    const { data, error } = await SupabaseDB.MEETINGS.select("*");
    if (error) throw error;

    return data.map((m) =>
        meetingView.parse({
            meetingId: m.meetingId,
            committeeType: m.committeeType,
            startTime: m.startTime,
        })
    );
};

export const getMeetingById = async (meetingId: string) => {
    const { data, error } = await SupabaseDB.MEETINGS.select()
        .eq("meeting_id", meetingId)
        .single();

    if (error) throw error;
    if (!data) return null;

    return meetingView.parse({
        meetingId: data.meetingId,
        committeeType: data.committeeType,
        startTime: data.startTime,
    });
};

export const createMeeting = async (
    meetingData: z.infer<typeof createMeetingValidator>
) => {
    const validatedData = createMeetingValidator.parse(meetingData);

    const { data, error } = await SupabaseDB.MEETINGS.insert([
        {
            committeeType: validatedData.committeeType,
            startTime: validatedData.startTime?.toISOString(),
        },
    ])
        .select()
        .single();

    if (error) throw error;

    return meetingView.parse({
        meetingId: data.meetingId,
        committeeType: data.committeeType,
        startTime: data.startTime,
    });
};

export const updateMeeting = async (
    meetingId: string,
    meetingData: z.infer<typeof createMeetingValidator>
) => {
    const validatedData = updateMeetingValidator.parse(meetingData);
    const { data, error } = await SupabaseDB.MEETINGS.update({
        committeeType: validatedData.committeeType,
        startTime: validatedData.startTime?.toISOString(),
    })
        .eq("meetingId", meetingId)
        .select()
        .single();

    if (error) throw error;
    if (!data) return null;

    return meetingView.parse({
        meetingId: data.meetingId,
        committeeType: data.committeeType,
        startTime: data.startTime,
    });
};

export const deleteMeeting = async (meetingId: string) => {
    const { data, error } = await SupabaseDB.MEETINGS.delete()
        .eq("meetingId", meetingId)
        .select()
        .single();

    if (error) throw error;
    return !!data;
};
