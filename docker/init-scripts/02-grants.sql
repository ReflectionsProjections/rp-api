-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON TABLE public."attendeeAttendances" TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."attendees"           TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."corporate"           TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."eventAttendances"    TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."events"              TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."meetings"            TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."notifications"       TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."draft_registrations" TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."registrations"       TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."authInfo"            TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."authRoles"           TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."speakers"            TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."staff"               TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."subscriptions"       TO anon, authenticated, service_role;
GRANT ALL ON TABLE public."authCodes"			TO anon, authenticated, service_role; 

-- Default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role;
