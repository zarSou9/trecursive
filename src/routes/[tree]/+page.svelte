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

<Tree {...data} />
