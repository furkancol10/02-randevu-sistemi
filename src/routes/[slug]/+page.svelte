<script lang="ts">
	import { qs } from '#lib/query.ts';
	import { formatPrice } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const stepNo = $derived({ service: 1, staff: 2, time: 3, details: 4 }[data.step]);
	const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
</script>

<svelte:head>
	<title>{data.info.name} - Online Randevu</title>
</svelte:head>

<div class="min-h-dvh bg-slate-50 text-slate-900" style:--accent={data.info.accent}>
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto max-w-md px-4 py-4">
			<h1 class="text-xl font-bold">{data.info.name}</h1>
			<p class="text-sm text-slate-600">Online randevu · Adım {stepNo}/4</p>
		</div>
	</header>

	<main class="mx-auto max-w-md space-y-4 px-4 py-5">
		{#if form?.message}
			<p
				role="alert"
				class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
			>
				{form.message}
			</p>
		{/if}

		{#if data.step === 'service'}
			<h2 class="text-lg font-semibold">{data.info.terms.service} seçin</h2>
			<ul class="space-y-2">
				{#each data.services as s (s.id)}
					<li>
						<a
							href={qs({ hizmet: s.id })}
							class="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-100"
						>
							<span>
								<span class="block font-medium">{s.name}</span>
								<span class="text-sm text-slate-600">{s.durationMin} dk</span>
							</span>
							<span class="font-semibold text-(--accent)">{formatPrice(s.priceKurus)}</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else if data.step === 'staff'}
			<a href="?" class="inline-flex min-h-11 items-center text-sm text-(--accent) underline">
				← {data.service.name}
			</a>
			<h2 class="text-lg font-semibold">{data.info.terms.resource} seçin</h2>
			<ul class="space-y-2">
				{#if data.staff.length > 1}
					<li>
						<a
							href={qs({ hizmet: data.service.id, personel: 'herhangi' })}
							class="flex min-h-14 items-center rounded-xl border-2 border-(--accent) bg-white p-3 font-medium"
						>
							{data.info.terms.resourceAny}
							<span class="ml-2 text-sm font-normal text-slate-600">(en uygun kişi atanır)</span>
						</a>
					</li>
				{/if}
				{#each data.staff as r (r.id)}
					<li>
						<a
							href={qs({ hizmet: data.service.id, personel: r.id })}
							class="flex min-h-14 items-center rounded-xl border border-slate-200 bg-white p-3 font-medium"
						>
							{r.name}
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<a
				href={data.step === 'details'
					? qs({ hizmet: data.service.id, personel: data.personel, gun: data.gun })
					: qs({ hizmet: data.service.id })}
				class="inline-flex min-h-11 items-center text-sm text-(--accent) underline"
			>
				← {data.step === 'details' ? 'Gün ve saat' : `${data.service.name} · ${data.staffName}`}
			</a>

			{#if data.step === 'time'}
				<h2 class="text-lg font-semibold">Gün ve saat seçin</h2>
				<nav aria-label="Gün seçimi" class="-mx-4 overflow-x-auto px-4">
					<ul class="flex gap-2 pb-2">
						{#each data.days as d (d.date)}
							<li>
								<a
									href={qs({ hizmet: data.service.id, personel: data.personel, gun: d.date })}
									aria-current={d.date === data.gun ? 'date' : undefined}
									class="flex min-h-16 w-14 flex-col items-center justify-center rounded-xl border text-sm {d.date ===
									data.gun
										? 'border-(--accent) bg-(--accent) text-white'
										: 'border-slate-200 bg-white'}"
								>
									<span>{d.weekday}</span>
									<span class="text-lg font-semibold">{d.dayOfMonth}</span>
								</a>
							</li>
						{/each}
					</ul>
				</nav>
				{#if data.gun && data.slots.length > 0}
					<p class="text-sm text-slate-600">{data.gunLabel}</p>
					<ul class="grid grid-cols-3 gap-2">
						{#each data.slots as t (t.value)}
							<li>
								<a
									href={qs({
										hizmet: data.service.id,
										personel: data.personel,
										gun: data.gun,
										saat: t.value
									})}
									class="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white font-medium active:bg-slate-100"
								>
									{t.label}
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="rounded-xl bg-white p-4 text-slate-600">
						Bu gün için uygun saat yok. Başka bir gün seçin.
					</p>
				{/if}
			{:else}
				<h2 class="text-lg font-semibold">Bilgileriniz</h2>
				<section class="rounded-xl border border-slate-200 bg-white p-3 text-sm" aria-label="Özet">
					<p class="font-medium">{data.service.name} · {formatPrice(data.service.priceKurus)}</p>
					<p>{data.gunLabel} · {data.saatLabel}</p>
					<p class="text-slate-600">{data.info.terms.resource}: {data.staffName}</p>
				</section>

				<form
					method="POST"
					action={`${qs({ hizmet: data.service.id, personel: data.personel, gun: data.gun, saat: data.saat })}&/book`}
					class="space-y-3"
				>
					<input type="hidden" name="hizmet" value={data.service.id} />
					<input type="hidden" name="personel" value={data.personel} />
					<input type="hidden" name="gun" value={data.gun} />
					<input type="hidden" name="saat" value={data.saat} />

					<div>
						<label for="ad" class="mb-1 block text-sm font-medium">Ad Soyad</label>
						<input
							id="ad"
							name="ad"
							autocomplete="name"
							required
							value={form?.values?.ad ?? ''}
							aria-invalid={form?.errors?.ad ? 'true' : undefined}
							class={field}
						/>
						{#if form?.errors?.ad}<p class="mt-1 text-sm text-red-700">{form.errors.ad}</p>{/if}
					</div>
					<div>
						<label for="telefon" class="mb-1 block text-sm font-medium">Cep telefonu</label>
						<input
							id="telefon"
							name="telefon"
							type="tel"
							inputmode="tel"
							autocomplete="tel"
							placeholder="05xx xxx xx xx"
							required
							value={form?.values?.telefon ?? ''}
							aria-invalid={form?.errors?.telefon ? 'true' : undefined}
							class={field}
						/>
						{#if form?.errors?.telefon}<p class="mt-1 text-sm text-red-700">
								{form.errors.telefon}
							</p>{/if}
					</div>

					<!-- Honeypot: gerçek kullanıcıya görünmez -->
					<div class="absolute -left-[9999px]" aria-hidden="true">
						<label for="website">Web sitesi</label>
						<input id="website" name="website" tabindex="-1" autocomplete="off" />
					</div>

					<div>
						<label class="flex items-start gap-3 text-sm">
							<input type="checkbox" name="kvkk" required class="mt-0.5 size-6 shrink-0" />
							<span>
								<a href="#aydinlatma" class="underline">KVKK aydınlatma metnini</a> okudum, kabul ediyorum.
							</span>
						</label>
						{#if form?.errors?.kvkk}<p class="mt-1 text-sm text-red-700">{form.errors.kvkk}</p>{/if}
					</div>

					<button
						type="submit"
						class="min-h-12 w-full rounded-xl bg-(--accent) px-4 text-base font-semibold text-white"
					>
						Randevuyu onayla
					</button>
				</form>

				<section id="aydinlatma" class="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
					<h3 class="font-semibold">KVKK Aydınlatma</h3>
					<p>
						Ad ve telefon bilgileriniz yalnızca randevunuzu oluşturmak ve size hatırlatma yapmak
						amacıyla
						{data.info.name} tarafından işlenir; üçüncü kişilerle paylaşılmaz. Silinmesini talep etmek
						için salonla iletişime geçebilirsiniz.
					</p>
				</section>
			{/if}
		{/if}
	</main>
</div>
