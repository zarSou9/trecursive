<script lang="ts">
	import ThreeDotsAlt from '$lib/icons/ThreeDotsAlt.svelte';
	import type { DropDownItem } from '$lib/types';
	import { clickOutside, getMetaKey } from '$lib/utils';
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { slide } from 'svelte/transition';

	interface Props {
		dropdownItems: DropDownItem[];
	}
	let { dropdownItems }: Props = $props();

	const isMobile: Writable<boolean> = getContext('isMobileStore');

	let dropdownOpen = $state(false);
	let metaKey = $state('⌘');

	onMount(() => {
		metaKey = getMetaKey();
	});
</script>

<div class="relative">
	<button
		onclick={() => (dropdownOpen = !dropdownOpen)}
		aria-label="nav"
		class="rounded-md stroke-[#d1d1d1] p-1.5 transition-colors hover:stroke-gray-50 {dropdownOpen
			? 'bg-gray-800 stroke-gray-50'
			: 'bg-[#1f1f1f] stroke-[#d1d1d1] hover:bg-[#202a39]'}"
	>
		<ThreeDotsAlt />
	</button>

	{#if dropdownOpen}
		<div
			use:clickOutside={() => setTimeout(() => (dropdownOpen = false))}
			transition:slide={{ duration: 200 }}
			class="absolute right-0 top-[calc(100%+4px)] z-[1] min-w-[130px] rounded-md border border-gray-700 bg-gray-900 py-1 shadow-lg md:min-w-[150px]"
		>
			{#each [...dropdownItems.filter((i) => i.key), ...dropdownItems.filter((i) => !i.key)] as dropdownItem, i}
				{#if !dropdownItem.key && dropdownItems[i - 1]?.key}
					<div class="my-1 border-t border-gray-800"></div>
				{/if}
				<button
					onclick={() => {
						dropdownOpen = false;
						dropdownItem.func();
					}}
					class="flex w-full items-center px-3 py-1.5 text-[13px] text-gray-300 hover:bg-gray-800 hover:text-white"
				>
					<span>{dropdownItem.title}</span>
					{#if dropdownItem.key && !$isMobile}
						<span class="ml-auto text-[11px] text-gray-500">
							{dropdownItem.metaKey ? metaKey : ''}{dropdownItem.shiftKey
								? '⇧'
								: ''}{dropdownItem.key.toUpperCase()}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
