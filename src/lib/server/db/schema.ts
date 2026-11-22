import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	smallint,
	text,
	time,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import { tstzrange } from './range';

const id = () => integer().primaryKey().generatedAlwaysAsIdentity();

export const businesses = pgTable(
	'businesses',
	{
		id: id(),
		slug: text().notNull().unique(),
		name: text().notNull(),
		vertical: text().notNull(),
		timezone: text().notNull().default('Europe/Istanbul'),
		slotStepMin: integer('slot_step_min').notNull().default(15),
		/** wa.me biçimi: yalnız rakam, ülke kodlu (905321234567) */
		phone: text(),
		settings: jsonb().$type<Record<string, unknown>>().notNull().default({})
	},
	(t) => [check('businesses_slot_step_pos', sql`${t.slotStepMin} > 0`)]
);

export const admins = pgTable('admins', {
	id: id(),
	businessId: integer('business_id')
		.notNull()
		.references(() => businesses.id, { onDelete: 'cascade' }),
	email: text().notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const sessions = pgTable('sessions', {
	id: text().primaryKey(),
	adminId: integer('admin_id')
		.notNull()
		.references(() => admins.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const services = pgTable(
	'services',
	{
		id: id(),
		businessId: integer('business_id')
			.notNull()
			.references(() => businesses.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		durationMin: integer('duration_min').notNull(),
		priceKurus: integer('price_kurus').notNull(),
		bufferMin: integer('buffer_min').notNull().default(0),
		active: boolean().notNull().default(true),
		sort: integer().notNull().default(0)
	},
	(t) => [
		check('services_duration_pos', sql`${t.durationMin} > 0`),
		check('services_buffer_nonneg', sql`${t.bufferMin} >= 0`)
	]
);

export const resources = pgTable('resources', {
	id: id(),
	businessId: integer('business_id')
		.notNull()
		.references(() => businesses.id, { onDelete: 'cascade' }),
	name: text().notNull(),
	/** personel | doktor | saha */
	kind: text().notNull().default('personel'),
	active: boolean().notNull().default(true),
	sort: integer().notNull().default(0)
});

export const resourceServices = pgTable(
	'resource_services',
	{
		resourceId: integer('resource_id')
			.notNull()
			.references(() => resources.id, { onDelete: 'cascade' }),
		serviceId: integer('service_id')
			.notNull()
			.references(() => services.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.resourceId, t.serviceId] })]
);

/** Günde birden çok aralık olabilir (öğle arası = iki satır). weekday: 0=Pazar … 6=Cumartesi. */
export const workingHours = pgTable(
	'working_hours',
	{
		id: id(),
		resourceId: integer('resource_id')
			.notNull()
			.references(() => resources.id, { onDelete: 'cascade' }),
		weekday: smallint().notNull(),
		startTime: time('start_time').notNull(),
		endTime: time('end_time').notNull()
	},
	(t) => [
		check('working_hours_weekday', sql`${t.weekday} between 0 and 6`),
		check('working_hours_order', sql`${t.startTime} < ${t.endTime}`)
	]
);

export const timeOff = pgTable('time_off', {
	id: id(),
	resourceId: integer('resource_id')
		.notNull()
		.references(() => resources.id, { onDelete: 'cascade' }),
	period: tstzrange().notNull(),
	reason: text()
});

export const appointments = pgTable(
	'appointments',
	{
		id: id(),
		businessId: integer('business_id')
			.notNull()
			.references(() => businesses.id, { onDelete: 'cascade' }),
		resourceId: integer('resource_id')
			.notNull()
			.references(() => resources.id, { onDelete: 'cascade' }),
		serviceId: integer('service_id')
			.notNull()
			.references(() => services.id, { onDelete: 'cascade' }),
		/** Dolu aralık: başlangıç .. başlangıç + süre + buffer. Çakışma kısıtı bunun üstünde (bkz. drizzle/ özel migration). */
		period: tstzrange().notNull(),
		/** Hizmet süresi anlık kopyası (buffer hariç); bitiş = lower(period) + durationMin. */
		durationMin: integer('duration_min').notNull(),
		customerName: text('customer_name').notNull(),
		customerPhone: text('customer_phone').notNull(),
		status: text().notNull().default('confirmed'),
		manageToken: uuid('manage_token').notNull().defaultRandom().unique(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('appointments_duration_pos', sql`${t.durationMin} > 0`),
		// boş aralık exclusion kısıtını etkisizleştirir (boş && x = false)
		check('appointments_period_nonempty', sql`not isempty(${t.period})`),
		check('appointments_status', sql`${t.status} in ('pending','confirmed','cancelled')`),
		index('appointments_business_idx').on(t.businessId, t.resourceId)
	]
);

/**
 * Hız sınırı sayaçları (sabit pencere). Anahtar: "<kapsam>:<ip|e-posta>". Her örnek aynı satırı
 * paylaşır; artırma tek bir upsert deyimidir (bkz. rate-limit.ts). Süresi dolan satırlar fırsat
 * düştükçe silinir.
 */
export const rateLimits = pgTable(
	'rate_limits',
	{
		key: text().primaryKey(),
		count: integer().notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
	},
	(t) => [index('rate_limits_expires_idx').on(t.expiresAt)]
);
