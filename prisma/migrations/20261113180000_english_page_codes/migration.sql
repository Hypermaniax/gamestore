-- Public route migration: English static page codes.

UPDATE "static_pages" SET "code" = 'terms-and-conditions' WHERE "code" = 'syarat-ketentuan';
UPDATE "static_pages" SET "code" = 'privacy' WHERE "code" = 'privasi';
UPDATE "static_pages" SET "code" = 'warranty' WHERE "code" = 'garansi';
