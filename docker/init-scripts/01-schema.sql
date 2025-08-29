-- Drop existing schema if it exists
DROP SCHEMA IF EXISTS public CASCADE;

-- Create schema
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO postgres;
COMMENT ON SCHEMA public IS 'standard public schema';

ALTER DATABASE postgres SET TIMEZONE TO 'UTC';

-- Create types
CREATE TYPE public."committeeNames" AS ENUM (
    'CONTENT',
    'CORPORATE',
    'DESIGN',
    'DEV',
    'FULL TEAM',
    'MARKETING',
    'OPERATIONS'
);

CREATE TYPE public."eventType" AS ENUM (
    'SPEAKER',
    'CORPORATE',
    'SPECIAL',
    'PARTNERS',
    'MEALS',
    'CHECKIN'
);

CREATE TYPE public."roleType" AS ENUM (
    'USER',
    'STAFF',
    'ADMIN',
    'CORPORATE',
    'PUZZLEBANG'
);

CREATE TYPE public."staffAttendanceType" AS ENUM (
    'PRESENT',
    'EXCUSED',
    'ABSENT'
);

CREATE TYPE public."tierType" AS ENUM (
    'TIER1',
    'TIER2',
    'TIER3'
);

CREATE TYPE public."iconColorType" AS ENUM (
    'BLUE',
    'RED',
    'GREEN',
    'YELLOW',
    'PINK',
    'BLACK',
    'PURPLE',
    'ORANGE'
);

-- Create tables
CREATE TABLE public."attendeeAttendances" (
    "userId" character varying NOT NULL,
    "eventsAttended" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    CONSTRAINT "attendeeAttendance_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE public."attendees" (
    "userId" character varying NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "hasPriorityMon" boolean DEFAULT false NOT NULL,
    "hasPriorityTue" boolean DEFAULT false NOT NULL,
    "hasPriorityWed" boolean DEFAULT false NOT NULL,
    "hasPriorityThu" boolean DEFAULT false NOT NULL,
    "hasPriorityFri" boolean DEFAULT false NOT NULL,
    "hasPrioritySat" boolean DEFAULT false NOT NULL,
    "hasPrioritySun" boolean DEFAULT false NOT NULL,
    "currentTier" public."tierType" DEFAULT 'TIER1' NOT NULL,
    "icon" public."iconColorType" DEFAULT 'RED' NOT NULL,
    "tags" text[] DEFAULT '{}'::text[] NOT NULL,
    "favoriteEvents" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    "puzzlesCompleted" text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT "attendees_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE public."corporate" (
    "email" text NOT NULL,
    "name" text NOT NULL,
    CONSTRAINT "corporate_pkey" PRIMARY KEY ("email")
);

CREATE TABLE public."eventAttendances" (
    "eventId" uuid NOT NULL,
    "attendee" character varying NOT NULL,
    CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("eventId", "attendee")
);

CREATE TABLE public."events" (
    "eventId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "startTime" timestamp with time zone NOT NULL,
    "endTime" timestamp with time zone NOT NULL,
    "points" integer NOT NULL,
    "description" text NOT NULL,
    "isVirtual" boolean NOT NULL,
    "imageUrl" text,
    "location" text,
    "isVisible" boolean DEFAULT false NOT NULL,
    "attendanceCount" integer DEFAULT 0 NOT NULL,
    "eventType" public."eventType" NOT NULL,
    CONSTRAINT "events_pkey" PRIMARY KEY ("eventId")
);

CREATE TABLE public."leaderboardSubmissions" (
    "submissionId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "day" date NOT NULL,
    "count" integer NOT NULL,
    "submittedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "submittedBy" character varying NOT NULL,
    CONSTRAINT "leaderboardSubmissions_pkey" PRIMARY KEY ("submissionId"),
    CONSTRAINT "leaderboardSubmissions_day_unique" UNIQUE ("day")
);

CREATE TABLE public."meetings" (
    "meetingId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "committeeType" public."committeeNames" NOT NULL,
    "startTime" timestamp with time zone NOT NULL,
    CONSTRAINT "meetings_pkey" PRIMARY KEY ("meetingId")
);

CREATE TABLE public."notifications" (
    "userId" character varying NOT NULL,
    "deviceId" text NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE public."draftRegistrations" (
    "allergies" text[] DEFAULT '{}'::text[] NOT NULL,
    "allergiesOther" text NOT NULL,
    "dietaryRestrictions" text[] DEFAULT '{}'::text[] NOT NULL,
    "dietaryOther" text NOT NULL,
    "educationLevel" text NOT NULL,
    "educationOther" text NOT NULL,
    "email" text NOT NULL,
    "ethnicity" text[] DEFAULT '{}'::text[] NOT NULL,
    "ethnicityOther" text NOT NULL,
    "gender" text NOT NULL,
    "genderOther" text NOT NULL,
    "graduationYear" text NOT NULL,
    "howDidYouHear" text[] DEFAULT '{}'::text[] NOT NULL,
    "majors" text[] DEFAULT '{}'::text[] NOT NULL,
    "minors" text[] DEFAULT '{}'::text[] NOT NULL,
    "name" text NOT NULL,
    "opportunities" text[] DEFAULT '{}'::text[] NOT NULL,
    "personalLinks" text[] DEFAULT '{}'::text[] NOT NULL,
    "resume" text DEFAULT '' NOT NULL,
    "school" text NOT NULL,
    "isInterestedMechMania" boolean NOT NULL,
    "isInterestedPuzzleBang" boolean NOT NULL,
    "tags" text[] DEFAULT '{}'::text[] NOT NULL,
    "userId" character varying NOT NULL,
    CONSTRAINT "draftRegistrations_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE public."registrations" (
    "allergies" text[] DEFAULT '{}'::text[] NOT NULL,
    "dietaryRestrictions" text[] DEFAULT '{}'::text[] NOT NULL,
    "educationLevel" text NOT NULL,
    "email" text NOT NULL,
    "ethnicity" text[] DEFAULT '{}'::text[] NOT NULL,
    "gender" text NOT NULL,
    "graduationYear" text NOT NULL,
    "howDidYouHear" text[] DEFAULT '{}'::text[] NOT NULL,
    "majors" text[] DEFAULT '{}'::text[] NOT NULL,
    "minors" text[] DEFAULT '{}'::text[] NOT NULL,
    "name" text NOT NULL,
    "opportunities" text[] DEFAULT '{}'::text[] NOT NULL,
    "personalLinks" text[] DEFAULT '{}'::text[] NOT NULL,
    "school" text NOT NULL,
    "isInterestedMechMania" boolean NOT NULL,
    "isInterestedPuzzleBang" boolean NOT NULL,
    "tags" text[] DEFAULT '{}'::text[] NOT NULL,
    "hasResume" boolean DEFAULT false NOT NULL,
    "userId" character varying NOT NULL,
    CONSTRAINT "registrations_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "registrations_email_key" UNIQUE ("email")
);

CREATE TABLE public."authInfo" (
    "userId" character varying NOT NULL,
    "authId" text NOT NULL,
    "email" text NOT NULL,
    "displayName" text NOT NULL,
    CONSTRAINT "authInfo_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "authInfo_authId_key" UNIQUE ("authId")
);

CREATE TABLE public."authRoles" (
    "userId" character varying NOT NULL,
    "role" public."roleType" NOT NULL,
    CONSTRAINT "authRoles_pkey" PRIMARY KEY ("userId", "role")
);

CREATE TABLE public."authCodes" (
    "email" character varying NOT NULL,
    "hashedVerificationCode" text NOT NULL,
    "expTime" timestamp with time zone NOT NULL,
    CONSTRAINT "authCodes_pkey" PRIMARY KEY ("email")
);

-- Indexes for auth tables
CREATE INDEX "authRoles_userId_idx" ON public."authRoles" ("userId");
CREATE INDEX "authRoles_role_idx"   ON public."authRoles" ("role");
CREATE INDEX "authInfo_authId_idx"  ON public."authInfo"  ("authId");

CREATE TABLE public."speakers" (
    "speakerId" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "title" text NOT NULL,
    "bio" text NOT NULL,
    "eventTitle" text NOT NULL,
    "eventDescription" text NOT NULL,
    "imgUrl" text NOT NULL,
    CONSTRAINT "speakers_pkey" PRIMARY KEY ("speakerId")
);

CREATE TABLE public."staff" (
    "email" text NOT NULL,
    "name" text NOT NULL,
    "team" public."committeeNames" NOT NULL,
    "attendances" jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT "staff_pkey" PRIMARY KEY ("email")
);

CREATE TABLE public."subscriptions" (
    "mailingList" text NOT NULL,
    "subscriptions" text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("mailingList")
);

-- Add foreign key constraints
ALTER TABLE ONLY public."attendeeAttendances"
    ADD CONSTRAINT "attendee_attendance_user_id_fkey" FOREIGN KEY ("userId") REFERENCES public."authInfo"("userId");

ALTER TABLE ONLY public."attendees"
    ADD CONSTRAINT "attendees_user_id_fkey" FOREIGN KEY ("userId") REFERENCES public."authInfo"("userId");

ALTER TABLE ONLY public."eventAttendances"
    ADD CONSTRAINT "event_attendance_attendee_fkey" FOREIGN KEY ("attendee") REFERENCES public."attendees"("userId");

ALTER TABLE ONLY public."eventAttendances"
    ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES public."events"("eventId");

ALTER TABLE ONLY public."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("userId") REFERENCES public."authInfo"("userId");

ALTER TABLE ONLY public."registrations"
    ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("userId") REFERENCES public."authInfo"("userId");

ALTER TABLE ONLY public."leaderboardSubmissions"
    ADD CONSTRAINT "leaderboard_submissions_submitted_by_fkey" FOREIGN KEY ("submittedBy") REFERENCES public."authInfo"("userId");

-- PostgreSQL function for atomic tier promotions
CREATE OR REPLACE FUNCTION public.promote_users_batch(user_ids text[])
RETURNS int AS $$
DECLARE
    promoted_count int := 0;
    tier1_count int := 0;
    tier2_count int := 0;
BEGIN
    -- Promote TIER1 -> TIER2
    UPDATE public."attendees" 
    SET "currentTier" = 'TIER2'
    WHERE "userId" = ANY(user_ids) 
    AND "currentTier" = 'TIER1';
    
    GET DIAGNOSTICS tier1_count = ROW_COUNT;
    
    -- Promote TIER2 -> TIER3  
    UPDATE public."attendees"
    SET "currentTier" = 'TIER3' 
    WHERE "userId" = ANY(user_ids)
    AND "currentTier" = 'TIER2';
    
    GET DIAGNOSTICS tier2_count = ROW_COUNT;
    
    -- Return total promoted users
    promoted_count := tier1_count + tier2_count;
    
    RETURN promoted_count;
END;
$$ LANGUAGE plpgsql;
