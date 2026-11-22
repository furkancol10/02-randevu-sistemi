<script lang="ts">
	import { qs } from '#lib/query.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const link = (over: Record<string, string | number | null>) =>
		qs({
			gun: data.date,
			gorunum: data.view,
			personel: data.resourceId,
			...over
		});
	const badge: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-900',
		confirmed: 'bg-emerald-100 text-emerald-900',
		cancelled: 'bg-slate-200 text-slate-600'
	};
	const label: Record<string, string> = {
		pending: 'Onay bekliyor',
		confirmed: 'Onaylı',
		cancelled: 'İptal'
	};
	const chip = (on: boolean) =>
		`flex min-h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap ${
			on ? 'border-pink-700 bg-pink-700 text-white' : 'border-slate-300 bg-white text-slate-800'
		}`;
</script>

<svelte:head>
	<title>Takvim - Yönetim</title>
</svelte:head>

<h1 class="text-xl font-bold">Takvim</h1>

<div class="flex gap-2">
	<a href={link({ gorunum: 'gun' })} class={chip(data.view === 'gun')}>Günlük</a>
	<a href={link({ gorunum: 'hafta' })} class={chip(data.view === 'hafta')}>Haftalık</a>
</div>

<div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Personel">
	<a href={link({ personel: null })} class={chip(data.resourceId === null)}>Tümü</a>
	{#each data.staff as r (r.id)}
		<a href={link({ personel: r.id })} class={chip(data.resourceId === r.id)}>{r.name}</a>
	{/each}
</div>

<div class="flex items-center justify-between gap-2">
	<a
		href={link({ gun: data.prev })}
		aria-label="Önceki"
		class="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white"
	>
		‹
	</a>
	<div class="text-center">
		<p class="text-sm font-semibold">{data.rangeLabel}</p>
		{#if data.date !== data.today}
			<a href={link({ gun: data.today })} class="text-sm text-pink-700 underline">Bugün</a>
		{/if}
	</div>
	<a
		href={link({ gun: data.next })}
		aria-label="Sonraki"
		class="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white"
	>
		›
	</a>
</div>

{#each data.days as day (day.date)}
	<section class="space-y-2">
		{#if data.view === 'hafta'}
			<h2 class="text-sm font-semibold {day.isToday ? 'text-pink-700' : 'text-slate-700'}">
				{day.label}{day.isToday ? ' · bugün' : ''}
			</h2>
		{/if}
		{#each day.timeOff as o (o.id)}
			<p class="rounded-xl border border-dashed border-slate-300 p-2 text-sm text-slate-600">
				İzin · {o.resourceName} · {o.from}–{o.to}{o.reason ? ` · ${o.reason}` : ''}
			</p>
		{/each}
		{#if day.appointments.length === 0}
			<p class="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
				Randevu yok.
			</p>
		{/if}
		<ul class="space-y-2">
			{#each day.appointments as a (a.id)}
				<li>
					<a
						href="/admin/randevu/{a.id}"
						class="block rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-100 {a.status ===
						'cancelled'
							? 'opacity-60'
							: ''}"
					>
						<span class="flex items-center justify-between gap-2">
							<span class="font-semibold">{a.time}–{a.endTime}</span>
							<span class="rounded-full px-2 py-0.5 text-xs font-medium {badge[a.status]}">
								{label[a.status]}
							</span>
						</span>
						<span class="mt-1 block {a.status === 'cancelled' ? 'line-through' : ''}">
							{a.customerName}
						</span>
						<span class="block text-sm text-slate-600">{a.serviceName} · {a.resourceName}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/each}
