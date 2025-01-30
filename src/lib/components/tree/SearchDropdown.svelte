<script lang="ts">
	import Search from '$lib/icons/Search.svelte';
	import { clickOutside } from '$lib/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { twMerge } from 'tailwind-merge';

	interface Props {
		value: string;
		children?: import('svelte').Snippet;
		collapsedWidth?: string;
		expandedWidth?: string;
		className?: string;
		placeholder?: string;
		expanded?: boolean;
	}

	let {
		value = $bindable(),
		expanded = $bindable(false),
		children,
		expandedWidth = 'clamp(130px, calc(100vw - 105px), 400px)',
		className = '',
		placeholder = 'Search other breakdowns...'
	}: Props = $props();

	const disableShortcuts: { v: boolean } = getContext('disableShortcuts');

	let inputHeight = $state(0);
</script>

<div
	class={twMerge('relative transition-[width]', className)}
	style={expanded ? `width: ${expandedWidth};` : `width: ${placeholder.length * 6.5 + 50}px;`}
	use:clickOutside={() => (expanded = false)}
>
	<div bind:clientHeight={inputHeight} class="relative z-[2] h-fit p-0">
		<input
			bind:value
			onfocus={() => {
				disableShortcuts.v = true;
				expanded = true;
			}}
			onblur={() => (disableShortcuts.v = false)}
			class="m-0 block w-full rounded-md border-[#494949] bg-[#151515] py-[4px] pl-[26px] text-[14px] text-[#b0b0b0] outline-none transition-colors placeholder:text-[#848484] {expanded
				? 'm-[.6px] border-[.7px]'
				: 'border-[1px] placeholder:text-[#6b6b6b]'}"
			{placeholder}
		/>
		<div
			class="pointer-events-none absolute bottom-0 left-[8px] top-0 flex items-center transition-colors {expanded
				? 'stroke-[#878787]'
				: 'stroke-[#606060]'}"
		>
			<div class="relative">
				<Search size="13px" />
			</div>
		</div>
	</div>
	{#if expanded}
		<div
			role="presentation"
			class="absolute left-[-4px] top-[-4px] z-[1] w-[calc(9px+100%)] overflow-clip rounded-md border-[.7px] border-[#606060] bg-[#171717] transition-[max-height]"
		>
			<div
				style="margin-top: {inputHeight + 8}px;"
				class="relative z-[20] h-[.7px] w-full bg-[#606060]"
			></div>
			{@render children?.()}
		</div>
	{/if}
</div>
