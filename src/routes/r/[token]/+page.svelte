<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const a = $derived(data.appointment);
	const tones = {
		ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
		wait: 'border-amber-300 bg-amber-50 text-amber-900',
		danger: 'border-red-300 bg-red-50 text-red-900'
	};
	const rows = $derived([
		['Salon', data.business.name],
		['Hizmet', a.serviceName],
		['Personel', a.resourceName],
		['Tarih', a.day],
		['Saat', a.time],
		['Ücret', a.price]
	]);
</script>

<svelte:head>
	<title>Randevunuz - {data.business.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-dvh bg-slate-50 text-slate-900">
	<main class="mx-auto max-w-md space-y-4 px-4 py-6">
		{#if form?.success}
			<p
				role="status"
				class="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
			>
				{form.success}
			</p>
		{/if}
		{#if form?.message}
			<p
				role="alert"
				class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
			>
				{form.message}
			</p>
		{/if}

		<div class="rounded-xl border p-4 {tones[a.view.tone]}">
			<h1 class="text-xl font-bold">{a.view.title}</h1>
			<p class="text-sm">{a.view.text}</p>
		</div>

		<dl class="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
			{#each rows as [k, v] (k)}
				<div class="flex justify-between gap-3">
					<dt class="text-slate-600">{k}</dt>
					<dd class="text-right font-medium">{v}</dd>
				</div>
			{/each}
		</dl>

		{#if a.status !== 'cancelled'}
			{#if data.canCancel}
				<form method="POST" action="?/iptal" class="space-y-2">
					<button
						class="min-h-12 w-full rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-800 active:bg-red-50"
					>
						Randevuyu iptal et
					</button>
					<p class="text-xs text-slate-500">
						Randevudan {data.cancelWindowHours} saat öncesine kadar iptal edebilirsiniz.
					</p>
				</form>
			{:else}
				<p class="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
					Randevuya {data.cancelWindowHours} saatten az kaldığı için çevrimiçi iptal edilemiyor. Lütfen
					salonla iletişime geçin.
				</p>
			{/if}
		{:else}
			<a
				href="/{data.business.slug}"
				class="flex min-h-12 items-center justify-center rounded-xl bg-pink-700 px-4 font-semibold text-white"
			>
				Yeni randevu al
			</a>
		{/if}

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
	</main>
</div>
