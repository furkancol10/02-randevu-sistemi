-- Çakışma koruması DB seviyesinde (ARCHITECTURE §4): aynı kaynakta iptal edilmemiş
-- iki randevunun dolu aralığı kesişemez. İhlal → SQLSTATE 23P01.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap" EXCLUDE USING gist ("resource_id" WITH =, "period" WITH &&) WHERE ("status" <> 'cancelled');
