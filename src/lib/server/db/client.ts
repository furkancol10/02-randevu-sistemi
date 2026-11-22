import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** Framework'ten bağımsız istemci: testler ve scripts/ de kullanır. */
export function createDb(url: string) {
	// prepare:false → Neon pooled bağlantı ile uyumlu
	const client = postgres(url, { prepare: false, onnotice: () => {} });
	return { db: drizzle(client, { schema }), close: () => client.end() };
}

export type Db = ReturnType<typeof createDb>['db'];
