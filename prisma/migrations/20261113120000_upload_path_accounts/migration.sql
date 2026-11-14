UPDATE "akun_foto"
SET "url" = replace("url", '/uploads/akun/', '/uploads/accounts/')
WHERE "url" LIKE '/uploads/akun/%';
