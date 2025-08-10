-- SQL Queries to Check Your Database
-- Run these in your MySQL client (phpMyAdmin, MySQL Workbench, or command line)

-- 1. Check if the contents table exists
SHOW TABLES LIKE 'contents';

-- 2. Check table structure
DESCRIBE contents;

-- 3. Count total records
SELECT COUNT(*) as total_records FROM contents;

-- 4. View all content records (basic info)
SELECT 
  id,
  title,
  handle,
  category,
  status,
  faq_count,
  word_count,
  created_at,
  updated_at
FROM contents
ORDER BY created_at DESC;

-- 5. View the most recent content with full details
SELECT * FROM contents 
ORDER BY created_at DESC 
LIMIT 1;

-- 6. Check for specific content by title or slug
SELECT * FROM contents 
WHERE title LIKE '%mother%' 
   OR slug LIKE '%mother%';

-- 7. Check content structure (JSON fields)
SELECT 
    id,
    title,
    JSON_EXTRACT(content, '$.h1') as h1_title,
    JSON_EXTRACT(content, '$.intro') as introduction,
    JSON_LENGTH(JSON_EXTRACT(content, '$.sections')) as section_count,
    JSON_LENGTH(JSON_EXTRACT(content, '$.faqs')) as faq_count
FROM contents
ORDER BY created_at DESC;

-- 8. Check sections and bullets specifically
SELECT 
    id,
    title,
    JSON_EXTRACT(content, '$.sections[0].h2') as first_section_title,
    JSON_EXTRACT(content, '$.sections[0].bullets') as first_section_bullets,
    JSON_LENGTH(JSON_EXTRACT(content, '$.sections[0].bullets')) as bullet_count
FROM contents
ORDER BY created_at DESC;

-- 9. Check table size and statistics
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH,
    (DATA_LENGTH + INDEX_LENGTH) as TOTAL_SIZE
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'contents';

-- 10. Check for any errors in the data
SELECT 
    id,
    title,
    CASE 
        WHEN content IS NULL THEN 'NULL content'
        WHEN JSON_VALID(content) = 0 THEN 'Invalid JSON'
        ELSE 'Valid JSON'
    END as content_status
FROM contents;

-- 11. Find content with bullets
SELECT 
    id,
    title,
    JSON_EXTRACT(content, '$.sections[0].bullets') as bullets
FROM contents
WHERE JSON_LENGTH(JSON_EXTRACT(content, '$.sections[0].bullets')) > 0;

-- 12. Check if HTML was generated
SELECT 
    id,
    title,
    CASE 
        WHEN html IS NULL THEN 'No HTML'
        WHEN html = '' THEN 'Empty HTML'
        ELSE CONCAT('HTML: ', LENGTH(html), ' characters')
    END as html_status
FROM contents
ORDER BY created_at DESC;

-- 13. Check handle field usage
SELECT 
    id,
    title,
    handle,
    CASE 
        WHEN handle IS NULL THEN 'No handle'
        WHEN handle = '' THEN 'Empty handle'
        ELSE CONCAT('Handle: ', handle)
    END as handle_status
FROM contents
ORDER BY created_at DESC;

-- 14. Check FAQ count distribution
SELECT 
    faq_count,
    COUNT(*) as content_count
FROM contents
WHERE faq_count IS NOT NULL
GROUP BY faq_count
ORDER BY faq_count;

-- 15. Find content with specific handle patterns
SELECT 
    id,
    title,
    handle
FROM contents
WHERE handle LIKE '%mother%' 
   OR handle LIKE '%day%'
   OR handle LIKE '%canada%';
