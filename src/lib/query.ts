/** Adım bağlantıları için "?a=1&b=2" üretir; null/undefined değerler atlanır. */
export function qs(params: Record<string, string | number | null | undefined>): string {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(params))
		if (v !== null && v !== undefined) sp.set(k, String(v));
	return `?${sp}`;
}
