<script lang="ts">
	import Cross from '$lib/icons/Cross.svelte';
	import { clickOutside } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import type { Snippet } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		onClose: () => void;
		children: Snippet;
		closeOnOutsideClick?: boolean;
		useCross?: boolean;
		className?: string;
		useAlt?: boolean;
	}

	let {
		onClose,
		children,
		closeOnOutsideClick = false,
		className = '',
		useCross = true,
		useAlt = false,
		...rest
	}: Props = $props();

	function close(e: MouseEvent) {
		e.stopPropagation();
		onClose();
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onClose();
		}
	}
</script>

<div
	onkeydown={handleKeyDown}
	class="fixed left-0 top-0 z-[4] flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm"
	role="presentation"
	transition:fade={{ duration: 120 }}
	{...rest}
>
	<div
		class={twMerge(
			'relative flex w-[90%] max-w-[500px] flex-col items-center rounded-md bg-[#2a2a2a] p-6 pt-5 shadow-lg',
			useAlt ? 'border-b-[1px] border-l-[1px] border-[#747474] bg-[#282a31fc]' : '',
			className
		)}
		use:clickOutside={closeOnOutsideClick ? onClose : () => {}}
		role="presentation"
	>
		{#if useCross}
			<button
				onclick={close}
				class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#3a3a3a]"
			>
				<Cross size="16px" color="#c3c3c3" />
			</button>
		{/if}
		{@render children?.()}
	</div>
</div>
