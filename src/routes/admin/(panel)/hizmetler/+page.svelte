<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const field = 'mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
	const btn = 'min-h-12 w-full rounded-xl px-4 font-semibold';
</script>

<svelte:head>
	<title>Hizmetler - Yönetim</title>
</svelte:head>

<h1 class="text-xl font-bold">Hizmetler</h1>

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

<details class="rounded-xl border border-slate-200 bg-white" open={form?.target === 'yeni'}>
	<summary class="flex min-h-12 cursor-pointer items-center px-4 font-semibold">
		Yeni hizmet ekle
	</summary>
	<form method="POST" action="?/ekle" class="space-y-3 border-t border-slate-200 p-4">
		<label class="block text-sm font-medium">
			Hizmet adı<input name="ad" required class={field} />
		</label>
		<div class="grid grid-cols-3 gap-2">
			<label class="block text-sm font-medium">
				Süre (dk)<input
					name="sure"
					type="number"
					inputmode="numeric"
					min="5"
					value="30"
					required
					class={field}
				/>
			</label>
			<label class="block text-sm font-medium">
				Fiyat (TL)<input name="fiyat" inputmode="decimal" required class={field} />
			</label>
			<label class="block text-sm font-medium">
				Ara (dk)<input
					name="tampon"
					type="number"
					inputmode="numeric"
					min="0"
					value="0"
					required
					class={field}
				/>
			</label>
		</div>
		<button class="{btn} bg-pink-700 text-white">Ekle</button>
	</form>
</details>

<ul class="space-y-2">
	{#each data.services as s (s.id)}
		<li>
			<details
				class="rounded-xl border border-slate-200 bg-white"
				open={form?.target === String(s.id)}
			>
				<summary class="flex min-h-14 cursor-pointer items-center justify-between gap-2 px-4 py-2">
					<span>
						<span class="block font-medium {s.active ? '' : 'text-slate-500 line-through'}">
							{s.name}
						</span>
						<span class="text-sm text-slate-600">
							{s.durationMin} dk · {s.price} TL{s.active ? '' : ' · pasif'}
						</span>
					</span>
				</summary>
				<div class="space-y-3 border-t border-slate-200 p-4">
					<form method="POST" action="?/guncelle" class="space-y-3">
						<input type="hidden" name="id" value={s.id} />
						<label class="block text-sm font-medium">
							Hizmet adı<input name="ad" required value={s.name} class={field} />
						</label>
						<div class="grid grid-cols-3 gap-2">
							<label class="block text-sm font-medium">
								Süre (dk)<input
									name="sure"
									type="number"
									inputmode="numeric"
									min="5"
									required
									value={s.durationMin}
									class={field}
								/>
							</label>
							<label class="block text-sm font-medium">
								Fiyat (TL)<input
									name="fiyat"
									inputmode="decimal"
									required
									value={s.price}
									class={field}
								/>
							</label>
							<label class="block text-sm font-medium">
								Ara (dk)<input
									name="tampon"
									type="number"
									inputmode="numeric"
									min="0"
									required
									value={s.bufferMin}
									class={field}
								/>
							</label>
						</div>
						<label class="flex min-h-11 items-center gap-3 text-sm">
							<input type="checkbox" name="aktif" checked={s.active} class="size-5" /> Müşterilere açık
						</label>
						<button class="{btn} bg-slate-900 text-white">Kaydet</button>
					</form>
					<form method="POST" action="?/sil">
						<input type="hidden" name="id" value={s.id} />
						<button class="{btn} border border-red-300 bg-white text-red-800">Sil</button>
					</form>
				</div>
			</details>
		</li>
	{/each}
</ul>
