<script lang="ts">
	import Cross from '$lib/icons/Cross.svelte';
	import { clickOutside } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import { twMerge } from 'tailwind-merge';

	interface Props {
		onClose: () => void;
		children: import('svelte').Snippet;
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
		useAlt = false
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
	class="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-40 flex justify-center items-center z-[4] backdrop-blur-sm"
	role="presentation"
	transition:fade={{ duration: 120 }}
>
	<div
		class={twMerge(
			'relative flex flex-col bg-[#2a2a2a] rounded-md p-6 pt-5 items-center w-[90%] max-w-[500px] shadow-lg',
			useAlt ? 'border-b-[1px] border-l-[1px] border-[#747474] bg-[#282a31fc]' : '',
			className
		)}
		use:clickOutside={closeOnOutsideClick ? onClose : () => {}}
		role="presentation"
	>
		{#if useCross}
			<button
				onclick={close}
				class="flex absolute top-2 right-2 hover:bg-[#3a3a3a] rounded-full w-8 h-8 items-center justify-center transition-colors"
			>
				<Cross size="16px" color="#c3c3c3" />
			</button>
		{/if}
		{@render children?.()}
	</div>
</div>
