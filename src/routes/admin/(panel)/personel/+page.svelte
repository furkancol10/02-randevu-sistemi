<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const field = 'mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
</script>

<svelte:head>
	<title>Personel - Yönetim</title>
</svelte:head>

<h1 class="text-xl font-bold">Personel</h1>

{#if form?.message}
	<p role="alert" class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
		{form.message}
	</p>
{/if}

<ul class="space-y-2">
	{#each data.staff as r (r.id)}
		<li>
			<a
				href="/admin/personel/{r.id}"
				class="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-100"
			>
				<span>
					<span class="block font-medium {r.active ? '' : 'text-slate-500 line-through'}">
						{r.name}
					</span>
					<span class="text-sm text-slate-600">
						{r.serviceCount} hizmet{r.active ? '' : ' · pasif'}
					</span>
				</span>
				<span aria-hidden="true">›</span>
			</a>
		</li>
	{/each}
</ul>

<details class="rounded-xl border border-slate-200 bg-white" open={Boolean(form?.message)}>
	<summary class="flex min-h-12 cursor-pointer items-center px-4 font-semibold">
		Yeni personel ekle
	</summary>
	<form method="POST" action="?/ekle" class="space-y-3 border-t border-slate-200 p-4">
		<label class="block text-sm font-medium">Ad<input name="ad" required class={field} /></label>
		<fieldset class="space-y-1">
			<legend class="text-sm font-medium">Yaptığı hizmetler</legend>
			{#each data.services as s (s.id)}
				<label class="flex min-h-11 items-center gap-3 text-sm">
					<input type="checkbox" name="hizmet" value={s.id} class="size-5" />
					{s.name}
				</label>
			{/each}
		</fieldset>
		<button class="min-h-12 w-full rounded-xl bg-pink-700 px-4 font-semibold text-white">
			Ekle
		</button>
	</form>
</details>
