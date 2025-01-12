<script lang="ts">
	import { quintOut } from 'svelte/easing';
	import type { HTMLAttributes } from 'svelte/elements';
	import { fly } from 'svelte/transition';
	import { twMerge } from 'tailwind-merge';
	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: import('svelte').Snippet;
		position?: 'top-right' | 'bottom-left' | 'bottom-middle';
		className?: string;
	}

	let { children, position = 'top-right', className = '', ...rest }: Props = $props();
</script>

<div
	transition:fly={{
		duration: 300,
		x: position === 'top-right' ? 30 : position === 'bottom-left' ? -60 : 0,
		y: position === 'top-right' ? -60 : 200,
		opacity: 0.5,
		easing: quintOut
	}}
	class={twMerge(
		'z-[400] fixed',
		className,
		position === 'top-right'
			? 'top-[20px] right-[20px]'
			: position === 'bottom-left'
				? 'bottom-[30px] left-[30px]'
				: 'bottom-[30px] left-[50%] -translate-x-1/2'
	)}
	{...rest}
>
	{@render children?.()}
</div>
