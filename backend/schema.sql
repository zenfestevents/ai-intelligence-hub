-- AetherAI Intelligence Radar schema (PostgreSQL / Supabase).
-- Safe to run more than once. Applied by: python database.py
-- gen_random_uuid() is built into PostgreSQL 13+, so no extension is needed.

CREATE TABLE IF NOT EXISTS intel_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    primary_category VARCHAR(50) NOT NULL CHECK (
        primary_category IN ('Model Release', 'Developer Tool', 'Research Paper', 'Hardware/Chips', 'Startup Funding')
    ),
    industry_tag VARCHAR(50) NOT NULL CHECK (
        industry_tag IN ('General', 'Medicine & Healthcare', 'Filmmaking & Media', 'Agriculture', 'Space & Robotics', 'Education', 'Enterprise')
    ),
    summary TEXT NOT NULL,
    exact_source_quote TEXT NOT NULL,
    source_url TEXT NOT NULL UNIQUE,
    country_of_origin VARCHAR(100) DEFAULT 'Global',
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS startups_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(150) NOT NULL UNIQUE,
    website_url TEXT NOT NULL,
    country VARCHAR(100) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    batch_or_funding VARCHAR(100),
    use_case_description TEXT NOT NULL,
    source_reference_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items that failed quote verification, so they are not re-sent to the LLM.
CREATE TABLE IF NOT EXISTS rejected_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL UNIQUE,
    reason VARCHAR(100) NOT NULL,
    attempted_quote TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_published_at ON intel_feed(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_industry ON intel_feed(industry_tag);
CREATE INDEX IF NOT EXISTS idx_intel_category ON intel_feed(primary_category);
CREATE INDEX IF NOT EXISTS idx_startups_country ON startups_directory(country);
CREATE INDEX IF NOT EXISTS idx_startups_industry ON startups_directory(industry);

-- The backend connects with the database password, which bypasses row level security.
-- Turning RLS on with no policies blocks Supabase's public REST API from reading or
-- writing these tables with the anon key.
ALTER TABLE intel_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE rejected_items ENABLE ROW LEVEL SECURITY;
