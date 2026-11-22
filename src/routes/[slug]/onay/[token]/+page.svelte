<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const a = $derived(data.appointment);
</script>

<svelte:head>
	<title>Randevunuz alındı - {data.business.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-dvh bg-slate-50 text-slate-900">
	<main class="mx-auto max-w-md space-y-4 px-4 py-6">
		<div class="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
			<h1 class="text-xl font-bold text-emerald-900">
				{a.status === 'pending' ? 'Randevu talebiniz alındı' : 'Randevunuz onaylandı'}
			</h1>
			<p class="text-sm text-emerald-900">
				{a.status === 'pending'
					? 'Salon onayladığında size haber verilecek.'
					: `Görüşmek üzere, ${a.customerName}.`}
			</p>
		</div>

		<dl class="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
			<div class="flex justify-between gap-3">
				<dt class="text-slate-600">Salon</dt>
				<dd class="text-right font-medium">{data.business.name}</dd>
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
				<dt class="text-slate-600">Tarih</dt>
				<dd class="text-right font-medium">{a.day}</dd>
			</div>
			<div class="flex justify-between gap-3">
				<dt class="text-slate-600">Saat</dt>
				<dd class="text-right font-medium">{a.time}</dd>
			</div>
			<div class="flex justify-between gap-3">
				<dt class="text-slate-600">Ücret</dt>
				<dd class="text-right font-medium">{a.price}</dd>
			</div>
			{#if data.business.address}
				<div class="flex justify-between gap-3">
					<dt class="text-slate-600">Adres</dt>
					<dd class="text-right">{data.business.address}</dd>
				</div>
			{/if}
		</dl>

		<div class="space-y-2">
			<a
				href={data.icsUrl}
				download="randevu.ics"
				class="flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-4 font-semibold text-white"
			>
				Takvime ekle (.ics)
			</a>
			{#if data.whatsappUrl}
				<a
					href={data.whatsappUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-4 font-semibold text-white"
				>
					WhatsApp ile salona yaz
				</a>
			{/if}
		</div>
		<p class="text-xs text-slate-500">
			Bu sayfanın bağlantısını saklayın; randevunuza buradan ulaşırsınız.
		</p>
	</main>
</div>
