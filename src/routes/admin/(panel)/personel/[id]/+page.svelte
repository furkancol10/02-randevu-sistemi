<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const field = 'mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
	const btn = 'min-h-12 w-full rounded-xl px-4 font-semibold';
	const small =
		'min-h-11 rounded-xl border border-red-300 bg-white px-3 text-sm font-medium text-red-800';
	// Pazartesi'den başlar; değer: 0=Pazar … 6=Cumartesi
	const dayNames: [number, string][] = [
		[1, 'Pazartesi'],
		[2, 'Salı'],
		[3, 'Çarşamba'],
		[4, 'Perşembe'],
		[5, 'Cuma'],
		[6, 'Cumartesi'],
		[0, 'Pazar']
	];
	const hoursOf = (weekday: number) => data.hours.filter((h) => h.weekday === weekday);
</script>

<svelte:head>
	<title>{data.resource.name} - Yönetim</title>
</svelte:head>

<a href="/admin/personel" class="inline-flex min-h-11 items-center text-sm text-pink-700 underline">
	← Personel
</a>
<h1 class="text-xl font-bold">{data.resource.name}</h1>

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

<section class="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
	<h2 class="font-semibold">Bilgiler ve hizmetler</h2>
	<form method="POST" action="?/guncelle" class="space-y-3">
		<label class="block text-sm font-medium">
			Ad<input name="ad" required value={data.resource.name} class={field} />
		</label>
		<label class="flex min-h-11 items-center gap-3 text-sm">
			<input type="checkbox" name="aktif" checked={data.resource.active} class="size-5" /> Müşterilere
			açık
		</label>
		<fieldset class="space-y-1">
			<legend class="text-sm font-medium">Yaptığı hizmetler</legend>
			{#each data.services as s (s.id)}
				<label class="flex min-h-11 items-center gap-3 text-sm">
					<input
						type="checkbox"
						name="hizmet"
						value={s.id}
						checked={data.resource.serviceIds.includes(s.id)}
						class="size-5"
					/>
					{s.name}
				</label>
			{/each}
		</fieldset>
		<button class="{btn} bg-slate-900 text-white">Kaydet</button>
	</form>
</section>

<section class="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
	<h2 class="font-semibold">Çalışma saatleri</h2>
	<p class="text-sm text-slate-600">
		Aynı güne birden çok aralık ekleyebilirsiniz (öğle arası için iki aralık).
	</p>
	<ul class="space-y-2">
		{#each dayNames as [weekday, name] (weekday)}
			<li
				class="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0"
			>
				<span class="w-24 shrink-0 pt-3 text-sm font-medium">{name}</span>
				<span class="flex-1 space-y-1">
					{#each hoursOf(weekday) as h (h.id)}
						<form method="POST" action="?/saatSil" class="flex items-center justify-between gap-2">
							<input type="hidden" name="id" value={h.id} />
							<span class="text-sm">{h.start}–{h.end}</span>
							<button class={small} aria-label="{name} {h.start}-{h.end} aralığını sil">Sil</button>
						</form>
					{:else}
						<span class="block pt-3 text-sm text-slate-500">Kapalı</span>
					{/each}
				</span>
			</li>
		{/each}
	</ul>
	<form method="POST" action="?/saatEkle" class="space-y-3 border-t border-slate-200 pt-3">
		<label class="block text-sm font-medium">
			Gün
			<select name="gun" class={field}>
				{#each dayNames as [weekday, name] (weekday)}
					<option value={weekday}>{name}</option>
				{/each}
			</select>
		</label>
		<div class="grid grid-cols-2 gap-2">
			<label class="block text-sm font-medium">
				Başlangıç<input name="baslangic" type="time" required value="09:00" class={field} />
			</label>
			<label class="block text-sm font-medium">
				Bitiş<input name="bitis" type="time" required value="18:00" class={field} />
			</label>
		</div>
		<button class="{btn} bg-pink-700 text-white">Aralık ekle</button>
	</form>
</section>

<section class="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
	<h2 class="font-semibold">İzinler</h2>
	<ul class="space-y-2">
		{#each data.timeOff as o (o.id)}
			<li>
				<form method="POST" action="?/izinSil" class="flex items-center justify-between gap-2">
					<input type="hidden" name="id" value={o.id} />
					<span class="text-sm">{o.label}{o.reason ? ` · ${o.reason}` : ''}</span>
					<button class={small}>Sil</button>
				</form>
			</li>
		{:else}
			<li class="text-sm text-slate-500">Planlı izin yok.</li>
		{/each}
	</ul>
	<form method="POST" action="?/izinEkle" class="space-y-3 border-t border-slate-200 pt-3">
		<label class="block text-sm font-medium">
			Başlangıç<input name="baslangic" type="datetime-local" required class={field} />
		</label>
		<label class="block text-sm font-medium">
			Bitiş<input name="bitis" type="datetime-local" required class={field} />
		</label>
		<label class="block text-sm font-medium">
			Neden (isteğe bağlı)<input name="neden" maxlength="120" class={field} />
		</label>
		<button class="{btn} bg-pink-700 text-white">İzin ekle</button>
	</form>
</section>
