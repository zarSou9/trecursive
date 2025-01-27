<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="min-h-screen bg-gradient-to-b from-[#151515] to-[#212121] px-5 py-16">
	<div class="mx-auto max-w-[900px] text-center">
		<h1 class="mb-6 text-5xl font-semibold text-white/90">
			{page.status}
			{page.error?.message}
		</h1>
		{#if page.status === 404}
			<p class="mb-8 text-xl text-white/75">Sorry, we couldn't find what you were looking for.</p>
		{:else}
			<p class="mb-8 text-xl text-white/75">Sorry, something went wrong.</p>
		{/if}
		<a
			href="/"
			class="inline-block rounded-xl bg-white/5 px-6 py-3 text-lg text-white/90 transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/10"
		>
			Go back home
		</a>
	</div>
</div>
