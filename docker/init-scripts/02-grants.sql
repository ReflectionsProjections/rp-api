-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON TABLE public."attendeeAttendance" TO anon;
GRANT ALL ON TABLE public."attendeeAttendance" TO authenticated;
GRANT ALL ON TABLE public."attendeeAttendance" TO service_role;

GRANT ALL ON TABLE public."attendees" TO anon;
GRANT ALL ON TABLE public."attendees" TO authenticated;
GRANT ALL ON TABLE public."attendees" TO service_role;

GRANT ALL ON TABLE public."corporate" TO anon;
GRANT ALL ON TABLE public."corporate" TO authenticated;
GRANT ALL ON TABLE public."corporate" TO service_role;

GRANT ALL ON TABLE public."eventAttendance" TO anon;
GRANT ALL ON TABLE public."eventAttendance" TO authenticated;
GRANT ALL ON TABLE public."eventAttendance" TO service_role;

GRANT ALL ON TABLE public."events" TO anon;
GRANT ALL ON TABLE public."events" TO authenticated;
GRANT ALL ON TABLE public."events" TO service_role;

GRANT ALL ON TABLE public."meetings" TO anon;
GRANT ALL ON TABLE public."meetings" TO authenticated;
GRANT ALL ON TABLE public."meetings" TO service_role;

GRANT ALL ON TABLE public."notifications" TO anon;
GRANT ALL ON TABLE public."notifications" TO authenticated;
GRANT ALL ON TABLE public."notifications" TO service_role;

GRANT ALL ON TABLE public."registrations" TO anon;
GRANT ALL ON TABLE public."registrations" TO authenticated;
GRANT ALL ON TABLE public."registrations" TO service_role;

GRANT ALL ON TABLE public."roles" TO anon;
GRANT ALL ON TABLE public."roles" TO authenticated;
GRANT ALL ON TABLE public."roles" TO service_role;

GRANT ALL ON TABLE public."speakers" TO anon;
GRANT ALL ON TABLE public."speakers" TO authenticated;
GRANT ALL ON TABLE public."speakers" TO service_role;

GRANT ALL ON TABLE public."staff" TO anon;
GRANT ALL ON TABLE public."staff" TO authenticated;
GRANT ALL ON TABLE public."staff" TO service_role;

GRANT ALL ON TABLE public."subscriptions" TO anon;
GRANT ALL ON TABLE public."subscriptions" TO authenticated;
GRANT ALL ON TABLE public."subscriptions" TO service_role;

-- Set default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;