/** Türkiye cep telefonunu "+905XXXXXXXXX" biçimine çevirir; geçersizse null. */
export function normalizeTrPhone(input: string): string | null {
	let digits = input.replace(/\D/g, '');
	if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
	else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
	return /^5\d{9}$/.test(digits) ? `+90${digits}` : null;
}
