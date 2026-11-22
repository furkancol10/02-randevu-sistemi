<script lang="ts">
	import { qs } from '#lib/query.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const a = $derived(data.appointment);
	const label: Record<string, string> = {
		pending: 'Onay bekliyor',
		confirmed: 'Onaylı',
		cancelled: 'İptal edildi'
	};
	const badge: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-900',
		confirmed: 'bg-emerald-100 text-emerald-900',
		cancelled: 'bg-slate-200 text-slate-700'
	};
</script>

<svelte:head>
	<title>Randevu #{a.id} - Yönetim</title>
</svelte:head>

<a
	href="/admin/takvim{qs({ gun: a.backDate })}"
	class="inline-flex min-h-11 items-center text-sm text-pink-700 underline"
>
	← Takvim
</a>

{#if form?.success}
	<p
		role="status"
		class="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
	>
		{form.success}
	</p>
{/if}
{#if form?.message}
	<p role="alert" class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
		{form.message}
	</p>
{/if}

<div class="flex items-center justify-between gap-2">
	<h1 class="text-xl font-bold">{a.customerName}</h1>
	<span data-testid="durum" class="rounded-full px-3 py-1 text-sm font-medium {badge[a.status]}">
		{label[a.status]}
	</span>
</div>

<dl class="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
	<div class="flex justify-between gap-3">
		<dt class="text-slate-600">Tarih</dt>
		<dd class="text-right font-medium">{a.day}</dd>
	</div>
	<div class="flex justify-between gap-3">
		<dt class="text-slate-600">Saat</dt>
		<dd class="text-right font-medium">{a.time}–{a.endTime}</dd>
	</div>
	<div class="flex justify-between gap-3">
		<dt class="text-slate-600">Hizmet</dt>
		<dd class="text-right font-medium">{a.serviceName}</dd>
	</div>
	<div class="flex justify-between gap-3">
		<dt class="text-slate-600">Personel</dt>
		<dd class="text-right font-medium">{a.resourceName}</dd>
	</div>
	<div class="flex justify-between gap-3">
		<dt class="text-slate-600">Ücret</dt>
		<dd class="text-right font-medium">{a.price}</dd>
	</div>
	<div class="flex justify-between gap-3">
		<dt class="text-slate-600">Telefon</dt>
		<dd class="text-right font-medium">
			<a href="tel:{a.customerPhone}" class="underline">{a.customerPhone}</a>
		</dd>
	</div>
</dl>

<div class="space-y-2">
	{#if a.status === 'pending'}
		<form method="POST" action="?/onayla">
			<button
				class="min-h-12 w-full rounded-xl bg-emerald-700 px-4 font-semibold text-white active:bg-emerald-800"
			>
				Onayla
			</button>
		</form>
	{/if}
	{#if data.whatsappUrl}
		<a
			href={data.whatsappUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-4 font-semibold text-white"
		>
			WhatsApp ile hatırlat
		</a>
	{/if}
	{#if a.status !== 'cancelled'}
		<form method="POST" action="?/iptal">
			<button
				class="min-h-12 w-full rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-800 active:bg-red-50"
			>
				Randevuyu iptal et
			</button>
		</form>
	{/if}
</div>
