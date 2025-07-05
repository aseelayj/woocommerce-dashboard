-- Add logo_url column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update existing stores with hardcoded logo URLs

-- Social Media Daily (English) - Production and Staging
UPDATE stores 
SET logo_url = 'https://www.socialmediadaily.com/wp-content/uploads/2025/06/newsmdlogo221.svg'
WHERE url LIKE '%socialmediadaily.com%' AND url NOT LIKE '%.de%';

-- Social Media Daily (German) - Production and Staging  
UPDATE stores 
SET logo_url = 'https://www.socialmediadaily.de/wp-content/uploads/newsmdlogo221.svg'
WHERE url LIKE '%socialmediadaily.de%';

-- Follower Fast - Production and Staging
UPDATE stores 
SET logo_url = 'https://www.followerfast.com/wp-content/uploads/2025/06/logo.webp'
WHERE url LIKE '%followerfast.com%';