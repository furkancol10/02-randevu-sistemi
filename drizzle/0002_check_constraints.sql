ALTER TABLE "appointments" ADD CONSTRAINT "appointments_duration_pos" CHECK ("appointments"."duration_min" > 0);--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_period_nonempty" CHECK (not isempty("appointments"."period"));--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_slot_step_pos" CHECK ("businesses"."slot_step_min" > 0);--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_buffer_nonneg" CHECK ("services"."buffer_min" >= 0);