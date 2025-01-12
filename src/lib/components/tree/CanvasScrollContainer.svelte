<script lang="ts">
	import { getContext } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { writable, type Writable } from 'svelte/store';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		className?: string;
		styleName?: string;
		children?: import('svelte').Snippet;
	}

	const isUsingMouse: Writable<boolean> = getContext('isUsingMouse') || writable(false);

	const wheelHandlerDefault = (
		e: WheelEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) => {
		if (e.ctrlKey || !mouseIn) return;
		const el = e.currentTarget;
		const isScrollingUp = e.deltaY < 0;
		const isScrollingDown = e.deltaY > 0;

		if (
			(isScrollingUp && el.scrollTop === 0) ||
			(isScrollingDown && el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
		) {
			mouseIn = false;
		} else {
			e.stopPropagation();
		}
	};
	let onWheelHandler = $state(wheelHandlerDefault);

	isUsingMouse.subscribe((v) => {
		if (v) onWheelHandler = (e) => e.stopPropagation();
		else onWheelHandler = wheelHandlerDefault;
	});

	let mouseIn = false;

	let { className = '', styleName = '', children, ...rest }: Props = $props();
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
	role="presentation"
	onmousemove={() => (mouseIn = true)}
	onmouseleave={() => (mouseIn = false)}
	onwheel={onWheelHandler}
	class="overflow-auto scrollbar-custom [&::-webkit-scrollbar-track]:bg-[#0000] {className}"
	style="scrollbar-color: #6e6e6e #0000; {styleName}"
	{...rest}
>
	{@render children?.()}
</div>

<style>
	:global(.scrollbar-custom::-webkit-scrollbar) {
		-webkit-appearance: none;
		width: 8px;
	}

	:global(.scrollbar-custom::-webkit-scrollbar-track) {
		background-color: transparent;
		background: none;
	}

	:global(.scrollbar-custom::-webkit-scrollbar-thumb) {
		background-color: #6e6e6e;
		border-radius: 4px;
	}
</style>
