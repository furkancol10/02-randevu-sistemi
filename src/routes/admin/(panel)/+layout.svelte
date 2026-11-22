<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const tabs = [
		{ href: '/admin/takvim', label: 'Takvim' },
		{ href: '/admin/hizmetler', label: 'Hizmetler' },
		{ href: '/admin/personel', label: 'Personel' }
	];
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-dvh bg-slate-50 pb-20 text-slate-900">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
			<div class="min-w-0">
				<p class="truncate font-bold">{data.businessName}</p>
				<p class="truncate text-xs text-slate-600">Yönetim · {data.email}</p>
			</div>
			<form method="POST" action="/admin/cikis">
				<button class="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium">
					Çıkış
				</button>
			</form>
		</div>
	</header>

	<main class="mx-auto max-w-2xl space-y-4 px-4 py-4">
		{@render children()}
	</main>

	<nav class="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white">
		<ul class="mx-auto grid max-w-2xl grid-cols-3">
			{#each tabs as t (t.href)}
				{@const active = page.url.pathname.startsWith(t.href)}
				<li>
					<a
						href={t.href}
						aria-current={active ? 'page' : undefined}
						class="flex min-h-14 items-center justify-center text-sm font-medium {active
							? 'text-pink-700'
							: 'text-slate-600'}"
					>
						{t.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
