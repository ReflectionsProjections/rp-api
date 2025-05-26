import { SupabaseDB } from "../../supabase"; // Supabase database
import { pool } from "../../../testing/jest.supabase-db.setup";
import { meetingView, createMeetingValidator, updateMeetingValidator } from "./meetings-schema";
import { v4 as uuidv4 } from 'uuid';

export const getAllMeetings = async () => {
  if (process.env.ENV === "TESTING") {
    const result = await pool.query("SELECT * FROM meetings");
    return result.rows.map((m) =>
      meetingView.parse({
        meetingId: m.meeting_id,
        committeeType: m.committee_type,
        startTime: m.start_time,
      })
    );
  } else {
    const { data, error } = await SupabaseDB.MEETINGS.select("*");
    if (error) throw error;

    return data.map((m) =>
      meetingView.parse({
        meetingId: m.meeting_id,
        committeeType: m.committee_type,
        startTime: m.start_time,
      })
    );
  }
};

export const getMeetingById = async (meetingId: string) => {
  if (process.env.ENV === "TESTING") {
    const result = await pool.query(
      'SELECT * FROM meetings WHERE meeting_id = $1',
      [meetingId]
    );
    if (result.rows.length === 0) return null;
    
    return meetingView.parse({
      meetingId: result.rows[0].meeting_id,
      committeeType: result.rows[0].committee_type,
      startTime: result.rows[0].start_time,
    });
  } else {
    const { data, error } = await SupabaseDB.MEETINGS
      .select()
      .eq("meeting_id", meetingId)
      .single();
    
    if (error) throw error;
    if (!data) return null;

    return meetingView.parse({
      meetingId: data.meeting_id,
      committeeType: data.committee_type,
      startTime: data.start_time,
    });
  }
};

export const createMeeting = async (meetingData: any) => {
  const validatedData = createMeetingValidator.parse(meetingData);
  const meetingId = uuidv4();

  if (process.env.ENV === "TESTING") {
    const result = await pool.query(
      'INSERT INTO meetings (meeting_id, committee_type, start_time) VALUES ($1, $2, $3) RETURNING *',
      [meetingId, validatedData.committeeType, validatedData.startTime]
    );
    
    return meetingView.parse({
      meetingId: result.rows[0].meeting_id,
      committeeType: result.rows[0].committee_type,
      startTime: result.rows[0].start_time,
    });
  } else {
    const { data, error } = await SupabaseDB.MEETINGS
      .insert([{
        committee_type: validatedData.committeeType,
        start_time: validatedData.startTime,
      }])
      .select()
      .single();

    if (error) throw error;

    return meetingView.parse({
      meetingId: data.meeting_id,
      committeeType: data.committee_type,
      startTime: data.start_time,
    });
  }
};

export const updateMeeting = async (meetingId: string, meetingData: any) => {
  const validatedData = updateMeetingValidator.parse(meetingData);

  if (process.env.ENV === "TESTING") {
    const result = await pool.query(
      'UPDATE meetings SET committee_type = $1, start_time = $2 WHERE meeting_id = $3 RETURNING *',
      [validatedData.committeeType, validatedData.startTime, meetingId]
    );
    
    if (result.rows.length === 0) return null;

    return meetingView.parse({
      meetingId: result.rows[0].meeting_id,
      committeeType: result.rows[0].committee_type,
      startTime: result.rows[0].start_time,
    });
  } else {
    const { data, error } = await SupabaseDB.MEETINGS
      .update({
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
  }
};

export const deleteMeeting = async (meetingId: string) => {
  if (process.env.ENV === "TESTING") {
    const result = await pool.query(
      'DELETE FROM meetings WHERE meeting_id = $1 RETURNING *',
      [meetingId]
    );
    return result.rows.length > 0;
  } else {
    const { data, error } = await SupabaseDB.MEETINGS
      .delete()
      .eq("meeting_id", meetingId)
      .select()
      .single();

    if (error) throw error;
    return !!data;
  }
};


