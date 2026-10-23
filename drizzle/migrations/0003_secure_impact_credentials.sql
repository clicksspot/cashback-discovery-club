CREATE TABLE public.integration_credentials (
  provider text PRIMARY KEY CHECK (provider = 'impact'),
  encrypted_credentials text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL
);
GRANT ALL ON public.integration_credentials TO service_role;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.integration_credentials IS 'Server-only encrypted integration credentials. No browser or anonymous access.';