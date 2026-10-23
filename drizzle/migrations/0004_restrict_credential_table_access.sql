REVOKE ALL ON public.integration_credentials FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.integration_credentials TO service_role;