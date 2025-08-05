-- Drop existing schema if it exists
DROP SCHEMA IF EXISTS public CASCADE;

-- Create schema
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO postgres;
COMMENT ON SCHEMA public IS 'standard public schema';

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
    "hasRedeemedTshirt" boolean DEFAULT false NOT NULL,
    "hasRedeemedButton" boolean DEFAULT false NOT NULL,
    "hasRedeemedTote" boolean DEFAULT false NOT NULL,
    "hasRedeemedCap" boolean DEFAULT false NOT NULL,
    "isEligibleTshirt" boolean DEFAULT true NOT NULL,
    "isEligibleButton" boolean DEFAULT false NOT NULL,
    "isEligibleTote" boolean DEFAULT false NOT NULL,
    "isEligibleCap" boolean DEFAULT false NOT NULL,
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
    "startTime" timestamp without time zone NOT NULL,
    "endTime" timestamp without time zone NOT NULL,
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

CREATE TABLE public."registrations" (
    "userId" character varying NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "university" text NOT NULL,
    "graduation" text,
    "major" text,
    "dietaryRestrictions" text[] DEFAULT '{}'::text[] NOT NULL,
    "allergies" text[] DEFAULT '{}'::text[] NOT NULL,
    "gender" text,
    "ethnicity" text[] DEFAULT '{}'::text[],
    "hearAboutRp" text[] DEFAULT '{}'::text[],
    "portfolios" text[] DEFAULT '{}'::text[] NOT NULL,
    "jobInterest" text[] DEFAULT '{}'::text[],
    "isInterestedMechMania" boolean NOT NULL,
    "isInterestedPuzzleBang" boolean NOT NULL,
    "hasResume" boolean DEFAULT false NOT NULL,
    "hasSubmitted" boolean DEFAULT false NOT NULL,
    "degree" text NOT NULL,
    CONSTRAINT "registrations_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "registrations_email_key" UNIQUE ("email")
);

CREATE TABLE public."roles" (
    "userId" character varying NOT NULL,
    "displayName" text NOT NULL,
    "email" text NOT NULL,
    "roles" public."roleType"[] DEFAULT '{}'::public."roleType"[] NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "roles_email_key" UNIQUE ("email")
);

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
    ADD CONSTRAINT "attendee_attendance_user_id_fkey" FOREIGN KEY ("userId") REFERENCES public."roles"("userId");

ALTER TABLE ONLY public."attendees"
    ADD CONSTRAINT "attendees_user_id_fkey" FOREIGN KEY ("userId") REFERENCES public."roles"("userId");

ALTER TABLE ONLY public."eventAttendances"
    ADD CONSTRAINT "event_attendance_attendee_fkey" FOREIGN KEY ("attendee") REFERENCES public."attendees"("userId");

ALTER TABLE ONLY public."eventAttendances"
    ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY ("eventId") REFERENCES public."events"("eventId");

ALTER TABLE ONLY public."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("userId") REFERENCES public."roles"("userId");

ALTER TABLE ONLY public."registrations"
    ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("userId") REFERENCES public."roles"("userId");
