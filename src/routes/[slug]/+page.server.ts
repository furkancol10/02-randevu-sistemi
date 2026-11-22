import { error, fail, redirect } from '@sveltejs/kit';
import { availableSlots } from '#lib/server/booking/availability.ts';
import { book } from '#lib/server/booking/book.ts';
import {
	getActiveResourcesFor,
	getActiveServices,
	getBusinessBySlug
} from '#lib/server/booking/catalog.ts';
import { db } from '#lib/server/db/index.ts';
import { BOOKING_LIMIT, bookingKey, rateLimiter } from '#lib/server/limiters.ts';
import { addDays, formatDayLong, formatWeekdayShort, localDate, slotOption } from '#lib/time.ts';
import { bookingSchema, formStrings } from '#lib/validation.ts';
import { getVertical } from '#lib/verticals/index.ts';
import type { Actions, PageServerLoad } from './$types';

const STRIP_DAYS = 14;
const noErrors: Record<string, string> = {};

export const load: PageServerLoad = async ({ params, url }) => {
	const business = await getBusinessBySlug(db, params.slug);
	if (!business) error(404, 'Salon bulunamadı');
	const vertical = getVertical(business.vertical);
	const tz = business.timezone;
	const now = new Date();

	const serviceList = await getActiveServices(db, business.id);
	const info = {
		name: business.name,
		phone: business.phone,
		address: (business.settings.address as string | undefined) ?? null,
		accent: vertical.accent,
		terms: vertical.terms
	};
	const services = serviceList.map((s) => ({
		id: s.id,
		name: s.name,
		durationMin: s.durationMin,
		priceKurus: s.priceKurus
	}));

	const service = serviceList.find((s) => s.id === Number(url.searchParams.get('hizmet')));
	if (!service) return { step: 'service' as const, info, services };

	const staff = await getActiveResourcesFor(db, business.id, service.id);
	const personelParam = url.searchParams.get('personel');
	const resourceId: number | 'any' | null =
		personelParam === 'herhangi' && staff.length > 0
			? 'any'
			: (staff.find((r) => r.id === Number(personelParam))?.id ?? null);
	const selected = {
		service: {
			id: service.id,
			name: service.name,
			priceKurus: service.priceKurus,
			durationMin: service.durationMin
		}
	};
	if (resourceId === null) {
		return { step: 'staff' as const, info, services, ...selected, staff };
	}
	const staffName =
		resourceId === 'any' ? info.terms.resourceAny : staff.find((r) => r.id === resourceId)!.name;

	// Gün şeridi ve seçili günün slotları
	const today = localDate(now, tz);
	const dayCount = Math.min(STRIP_DAYS, vertical.maxAdvanceDays + 1);
	const dates = Array.from({ length: dayCount }, (_, i) => addDays(today, i));
	const slotsFor = async (date: string) =>
		(await availableSlots(db, { business, service, date, now }, resourceId)).map((d) =>
			slotOption(d, tz)
		);

	let gun = url.searchParams.get('gun');
	let slots: { value: string; label: string }[] = [];
	if (gun && dates.includes(gun)) {
		slots = await slotsFor(gun);
	} else {
		gun = null;
		for (const d of dates) {
			const s = await slotsFor(d);
			if (s.length > 0) {
				gun = d;
				slots = s;
				break;
			}
		}
	}
	const days = dates.map((d) => ({
		date: d,
		weekday: formatWeekdayShort(d, tz),
		dayOfMonth: Number(d.slice(8))
	}));
	const base = {
		info,
		services,
		...selected,
		staffName,
		personel: String(resourceId === 'any' ? 'herhangi' : resourceId),
		days,
		gun,
		gunLabel: gun ? formatDayLong(gun, tz) : null,
		slots
	};

	const saat = url.searchParams.get('saat');
	const chosen = slots.find((o) => o.value === saat);
	if (gun && chosen) {
		return { step: 'details' as const, ...base, saat: chosen.value, saatLabel: chosen.label };
	}
	return { step: 'time' as const, ...base };
};

export const actions: Actions = {
	book: async ({ request, params, getClientAddress }) => {
		const form = formStrings(await request.formData());
		const values = { ad: form.ad ?? '', telefon: form.telefon ?? '' };
		// IP hız sınırı (Postgres sayacı, bkz. rate-limit.ts); geçersiz denemeler de sayılır
		if (!(await rateLimiter.hit(bookingKey(getClientAddress()), BOOKING_LIMIT))) {
			return fail(429, {
				errors: noErrors,
				values,
				message: 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.'
			});
		}
		const parsed = bookingSchema.safeParse(form);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
			return fail(400, { errors, values, message: null });
		}
		const business = await getBusinessBySlug(db, params.slug);
		if (!business) error(404, 'Salon bulunamadı');
		const d = parsed.data;

		const result = await book(db, {
			businessId: business.id,
			serviceId: d.hizmet,
			resourceId: d.personel === 'herhangi' ? 'any' : d.personel,
			start: new Date(d.saat),
			customerName: d.ad,
			customerPhone: d.telefon
		});
		if (result.ok) redirect(303, `/${params.slug}/onay/${result.appointment.manageToken}`);

		const message =
			result.reason === 'conflict'
				? 'Bu saat az önce doldu. Lütfen başka bir saat seçin.'
				: 'Bu saat artık uygun değil. Lütfen başka bir saat seçin.';
		return fail(409, { errors: noErrors, values, message });
	}
};
