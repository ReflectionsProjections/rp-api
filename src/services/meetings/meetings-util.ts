import { SupabaseDB } from "../../supabase"; // Supabase database
import {
    meetingView,
    createMeetingValidator,
    updateMeetingValidator,
} from "./meetings-schema";

export const getAllMeetings = async () => {
    console.log("Getting all meetings from Supabase");
    const { data, error } = await SupabaseDB.MEETINGS.select("*");
    if (error) throw error;

    return data.map((m) =>
        meetingView.parse({
            meetingId: m.meeting_id,
            committeeType: m.committee_type,
            startTime: m.start_time,
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
        meetingId: data.meeting_id,
        committeeType: data.committee_type,
        startTime: data.start_time,
    });
};

export const createMeeting = async (meetingData: any) => {
    const validatedData = createMeetingValidator.parse(meetingData);

    const { data, error } = await SupabaseDB.MEETINGS.insert([
        {
            committee_type: validatedData.committeeType,
            start_time: validatedData.startTime,
        },
    ])
        .select()
        .single();

    if (error) throw error;

    return meetingView.parse({
        meetingId: data.meeting_id,
        committeeType: data.committee_type,
        startTime: data.start_time,
    });
};

export const updateMeeting = async (meetingId: string, meetingData: any) => {
    const validatedData = updateMeetingValidator.parse(meetingData);
    const { data, error } = await SupabaseDB.MEETINGS.update({
        committee_type: validatedData.committeeType,
        start_time: validatedData.startTime,
    })
        .eq("meeting_id", meetingId)
        .select()
        .single();

    if (error) throw error;
    if (!data) return null;

    return meetingView.parse({
        meetingId: data.meeting_id,
        committeeType: data.committee_type,
        startTime: data.start_time,
    });
};

export const deleteMeeting = async (meetingId: string) => {
    const { data, error } = await SupabaseDB.MEETINGS.delete()
        .eq("meeting_id", meetingId)
        .select()
        .single();

    if (error) throw error;
    return !!data;
};
