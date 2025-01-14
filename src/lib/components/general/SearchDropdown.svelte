<script lang="ts">
	import Search from '$lib/icons/Search.svelte';

	interface Props {
		value: string;
		children?: import('svelte').Snippet;
		collapsedWidth?: number;
		expandedWidth?: number;
	}

	let {
		value = $bindable(),
		children,
		collapsedWidth = 250,
		expandedWidth = 650
	}: Props = $props();

	let expanded = $state(false);
</script>

<div class="relative p-2">
	<input
		bind:value
		onfocus={() => (expanded = true)}
		onblur={() => (expanded = false)}
		class="h-[23px] w-[120px] rounded-md border-[1px] border-[#606060] bg-[#151515] pl-[22px] text-[11px] text-[#b0b0b0] outline-none transition-all placeholder:text-[#848484]"
		style={expanded
			? `border-color: #9c9c9c; width: ${expandedWidth}px;`
			: `width: ${collapsedWidth}px;`}
		placeholder="Search nodes..."
	/>
	<div
		class="pointer-events-none absolute left-[7px] top-[8px] transition-colors {expanded
			? 'border-[#9c9c9c]'
			: 'border-[#606060]'}"
	>
		<Search size="12px" />
	</div>
	{@render children?.()}
</div>
