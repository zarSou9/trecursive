<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		className?: string;
		styleName?: string;
		children?: import('svelte').Snippet;
	}

	let mouseIn = false;
	let isScrolling = false;
	let isMidScroll = false;
	let stopIsScrollingTimeout: number | undefined;
	let isMobile = false;

	let { className = '', styleName = '', children, ...rest }: Props = $props();
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
	role="presentation"
	onmousemove={() => (mouseIn = true)}
	onmouseleave={() => (mouseIn = false)}
	ontouchmove={(e) => {
		if (isMidScroll && e.touches.length === 1) {
			e.currentTarget.dispatchEvent(new TouchEvent('touchend'));
			e.stopPropagation();
			return;
		}
	}}
	ontouchstart={(e) => {
		isMobile = true;
		if (isMidScroll && e.touches.length === 1) e.stopPropagation();
	}}
	onscroll={(e) => {
		if (isMobile) {
			const el = e.currentTarget;
			if (el.scrollTop < 1 || el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
				isMidScroll = false;
			else isMidScroll = true;
		} else {
			clearTimeout(stopIsScrollingTimeout);
			isScrolling = true;
			stopIsScrollingTimeout = setTimeout(() => (isScrolling = false), 150);
		}
	}}
	onwheel={(e) => {
		isMobile = false;
		if (isScrolling) {
			e.stopPropagation();
			return;
		}
		if (e.ctrlKey || !mouseIn) return;
		const el = e.currentTarget;
		const isScrollingUp = e.deltaY < 0;
		const isScrollingDown = e.deltaY > 0;

		if (
			(isScrollingUp && el.scrollTop < 1) ||
			(isScrollingDown && el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
		) {
			mouseIn = false;
		} else {
			e.stopPropagation();
		}
	}}
	class="scrollbar-custom overflow-auto overscroll-none [&::-webkit-scrollbar-track]:bg-[#0000] {className}"
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
