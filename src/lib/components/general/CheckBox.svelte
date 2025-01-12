<script lang="ts">
	import { twMerge } from 'tailwind-merge';
	import Check from '$lib/icons/Check.svelte';

	interface Props {
		checked?: boolean;
		onClick?: any;
		disabled?: boolean;
		className?: string;
		size?: 'sm' | 'md';
	}

	let {
		checked = $bindable(false),
		onClick = () => {
			checked = !checked;
		},
		disabled = false,
		className = '',
		size = 'md'
	}: Props = $props();
</script>

<button onclick={onClick} {disabled} class={twMerge('outline-none', className)}>
	<div
		class="flex items-center border-[.9px] justify-center transition-colors {checked
			? 'bg-[#41649d] border-transparent'
			: 'border-[#8a8a8a]'} {size === 'sm' ? 'size-[18px] rounded' : 'size-[21px] rounded-md'}"
	>
		{#if checked}
			<Check color="#f0f0f0" size={size === 'sm' ? '12px' : '14px'} />
		{/if}
	</div>
</button>
