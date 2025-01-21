<script lang="ts">
	import { onMount } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { twMerge } from 'tailwind-merge';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		tooltip?: string;
		className?: string;
		children?: import('svelte').Snippet;
		tooltipClassName?: string;
		containerClassName?: string;
		toolTipContainerClassName?: string;
		side?: 'left' | 'right';
		delay?: number | 'auto';
		showOnHover?: boolean;
		isVisible?: boolean;
	}

	let {
		tooltip,
		className = '',
		tooltipClassName = '',
		containerClassName = '',
		toolTipContainerClassName = '',
		children,
		side = 'right',
		delay = 0,
		showOnHover = true,
		isVisible = $bindable(),
		...restProps
	}: Props = $props();

	let timeoutId: number | undefined;

	onMount(() => {
		setTimeout(() => {
			hideTooltip();
		}, 10);
	});

	function showTooltip() {
		timeoutId = setTimeout(
			() => {
				isVisible = true;
			},
			delay === 'auto' ? 500 : delay
		);
	}

	function hideTooltip() {
		clearTimeout(timeoutId);
		isVisible = false;
	}
</script>

{#if !tooltip}
	{@render children?.()}
{:else}
	<span
		role="presentation"
		class={twMerge('relative', className)}
		onmouseenter={showTooltip}
		onmouseleave={hideTooltip}
	>
		<span
			role="presentation"
			onmousedown={hideTooltip}
			class={twMerge('cursor-help', containerClassName)}
		>
			{@render children?.()}
		</span>
		<div
			class={twMerge(
				'pointer-events-none absolute top-full z-10 w-max max-w-[300px] pt-1 text-[12px] text-[#e0e0e0] opacity-0 transition-opacity',
				isVisible && `opacity-100 ${showOnHover ? 'pointer-events-auto' : ''}`,
				side === 'left' ? 'right-0' : 'left-0',
				tooltipClassName
			)}
			{...restProps}
		>
			<div
				class={twMerge(
					'relative overflow-hidden rounded-md border border-[#2a3444] bg-[#121921] px-[12px] py-2 text-[#c6c6c6] shadow-lg shadow-black/40 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[#121921]',
					toolTipContainerClassName
				)}
			>
				{@html tooltip}
			</div>
		</div>
	</span>
{/if}
