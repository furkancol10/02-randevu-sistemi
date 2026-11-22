<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
</script>

<svelte:head>
	<title>Yönetici girişi</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-dvh bg-slate-50 text-slate-900">
	<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-8">
		<h1 class="text-2xl font-bold">Yönetici girişi</h1>

		{#if data.demo}
			<p class="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900">
				Demo giriş bilgileri hazır dolduruldu. Yalnız deneme içindir.
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

		<form method="POST" class="space-y-3">
			<label class="block text-sm font-medium">
				E-posta
				<input
					name="email"
					type="email"
					autocomplete="username"
					required
					value={form?.email ?? data.demo?.email ?? ''}
					class="mt-1 {field}"
				/>
			</label>
			<label class="block text-sm font-medium">
				Şifre
				<input
					name="password"
					type="password"
					autocomplete="current-password"
					required
					value={data.demo?.password ?? ''}
					class="mt-1 {field}"
				/>
			</label>
			<button
				class="min-h-12 w-full rounded-xl bg-pink-700 px-4 font-semibold text-white active:bg-pink-800"
			>
				Giriş yap
			</button>
		</form>
	</main>
</div>
