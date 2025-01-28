<script lang="ts">
	import Tree from '../components/Tree.svelte';
	import ArrowLine from '$lib/icons/ArrowLine.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<a
	href="/"
	onwheel={(e) => e.preventDefault()}
	class="fixed left-4 top-4 z-[1] flex fill-[#7d7d7d] text-[#7d7d7d] transition-colors hover:fill-[#bcbcbc] hover:text-[#bcbcbc]"
>
	<ArrowLine size="21" />
	<p class="ml-2 text-[14px]">All Maps</p>
</a>

{#await data.treePromise}
	<div class="min-h-screen px-5 py-20">
		<div class="mx-auto max-w-[900px] text-center">
			<div class="mb-6 text-3xl font-semibold text-white/90">Loading {data.title}...</div>
			<div class="text-xl text-white/75">Please wait while we fetch the data</div>
		</div>
	</div>
{:then tree}
	<Tree {...data} {tree} />
{:catch error}
	<div class="min-h-screen px-5 py-20">
		<div class="mx-auto max-w-[900px] text-center">
			<div class="mb-6 text-3xl font-semibold text-white/90">Error loading tree</div>
			<div class="mb-8 text-xl text-white/75">{error.message}</div>
		</div>
	</div>
{/await}
