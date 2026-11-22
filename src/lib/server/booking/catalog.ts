import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { appointments, businesses, resourceServices, resources, services } from '../db/schema';

export async function getBusinessBySlug(db: Db, slug: string) {
	const [b] = await db.select().from(businesses).where(eq(businesses.slug, slug));
	return b ?? null;
}

export async function getActiveServices(db: Db, businessId: number) {
	return db
		.select()
		.from(services)
		.where(and(eq(services.businessId, businessId), eq(services.active, true)))
		.orderBy(asc(services.sort), asc(services.id));
}

export async function getActiveResourcesFor(db: Db, businessId: number, serviceId: number) {
	return db
		.select({ id: resources.id, name: resources.name })
		.from(resources)
		.innerJoin(resourceServices, eq(resourceServices.resourceId, resources.id))
		.where(
			and(
				eq(resources.businessId, businessId),
				eq(resources.active, true),
				eq(resourceServices.serviceId, serviceId)
			)
		)
		.orderBy(asc(resources.sort), asc(resources.id));
}

/** Onay sayfası: manage_token + işletme eşleşmesi. */
export async function getAppointmentByToken(db: Db, businessId: number, token: string) {
	if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
	const [row] = await db
		.select({
			id: appointments.id,
			period: appointments.period,
			durationMin: appointments.durationMin,
			status: appointments.status,
			customerName: appointments.customerName,
			serviceName: services.name,
			priceKurus: services.priceKurus,
			resourceName: resources.name
		})
		.from(appointments)
		.innerJoin(services, eq(services.id, appointments.serviceId))
		.innerJoin(resources, eq(resources.id, appointments.resourceId))
		.where(and(eq(appointments.manageToken, token), eq(appointments.businessId, businessId)));
	return row ?? null;
}
