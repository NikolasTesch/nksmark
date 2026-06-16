-- Add tsvector column for Portuguese text search
ALTER TABLE "Artwork" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create trigger function
CREATE OR REPLACE FUNCTION artwork_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS artwork_search_trigger ON "Artwork";
CREATE TRIGGER artwork_search_trigger
  BEFORE INSERT OR UPDATE OF title, description ON "Artwork"
  FOR EACH ROW EXECUTE FUNCTION artwork_search_update();

-- GIN index
CREATE INDEX IF NOT EXISTS artwork_search_idx ON "Artwork" USING GIN(search_vector);

-- Populate existing records
UPDATE "Artwork" SET search_vector =
  setweight(to_tsvector('portuguese', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('portuguese', COALESCE(description, '')), 'B');
