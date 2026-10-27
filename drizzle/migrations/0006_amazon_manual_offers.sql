CREATE TABLE public.amazon_offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
 description text NOT NULL DEFAULT '',
 affiliate_url text NOT NULL CHECK (affiliate_url ~ '^https://(amzn\.to/[^[:space:]]+|(www\.)?amazon\.com/[^[:space:]]*[?&]tag=[^&#[:space:]]+[^[:space:]]*)$'),
 image_url text CHECK (image_url IS NULL OR image_url ~ '^https://[^[:space:]]+$'),
 is_active boolean NOT NULL DEFAULT false,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.amazon_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amazon_offers TO authenticated;
GRANT ALL ON public.amazon_offers TO service_role;
ALTER TABLE public.amazon_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY amazon_offers_public_read ON public.amazon_offers FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY amazon_offers_admin_access ON public.amazon_offers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.amazon_offers IS 'Manually curated Amazon USA affiliate-only offers, separate from cashback stores and Impact reconciliation. No prices or cashback fields.';