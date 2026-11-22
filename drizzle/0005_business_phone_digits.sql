-- Mevcut kayıtlar: rakam dışını at, geçersizse NULL (kısıt eklenebilsin)
UPDATE "businesses" SET "phone" = NULLIF(regexp_replace("phone", '\D', '', 'g'), '');--> statement-breakpoint
UPDATE "businesses" SET "phone" = NULL WHERE "phone" !~ '^[1-9][0-9]{9,14}$';--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_phone_digits" CHECK ("businesses"."phone" IS NULL OR "businesses"."phone" ~ '^[1-9][0-9]{9,14}$');