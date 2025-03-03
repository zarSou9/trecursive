<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { onMount, type Snippet } from 'svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		className?: string;
		styleName?: string;
		element?: HTMLDivElement;
		children?: Snippet;
	}

	let {
		className = '',
		styleName = '',
		children,
		element = $bindable(),
		...rest
	}: Props = $props();

	let mouseIn = false;
	let prevDelta = 0;

	let usingTouch = false;

	let atScrollStart = true;
	let atScrollEnd = false;
	let justStarted = false;
	let lastTapY: number;

	let scrollMiddleTouchEnded = false;
	let isScrollable = false;

	function checkScrollable() {
		if (element) isScrollable = element.clientHeight < element.scrollHeight - 1;
	}

	onMount(() => {
		checkScrollable();

		const resizeObserver = new ResizeObserver(() => {
			checkScrollable();
		});

		if (element) resizeObserver.observe(element);

		return () => {
			if (element) resizeObserver.unobserve(element);
			resizeObserver.disconnect();
		};
	});
</script>

<div
	role="presentation"
	bind:this={element}
	onmousemove={() => (mouseIn = true)}
	onmouseleave={() => (mouseIn = false)}
	ontouchmove={(e) => {
		if (e.touches.length === 1 && isScrollable) {
			if (atScrollStart || atScrollEnd) {
				const tapY = e.touches[0].clientY;
				if (tapY < lastTapY && atScrollStart) e.stopPropagation();
				else if (tapY > lastTapY && atScrollEnd) e.stopPropagation();
				else if (justStarted) {
					e.currentTarget.parentElement?.dispatchEvent(
						new TouchEvent('touchstart', {
							bubbles: true,
							cancelable: true,
							touches: Array.from(e.touches),
							targetTouches: Array.from(e.targetTouches),
							changedTouches: Array.from(e.changedTouches)
						})
					);
					justStarted = false;
				}
			} else {
				e.stopPropagation();
			}
		}
	}}
	ontouchstart={(e) => {
		usingTouch = true;
		if (e.touches.length === 1 && isScrollable) {
			e.stopPropagation();
			if (atScrollStart || atScrollEnd) {
				justStarted = true;
				lastTapY = e.touches[0].clientY;
			}
		}
	}}
	onscroll={(e) => {
		if (usingTouch && isScrollable) {
			const el = e.currentTarget;
			atScrollStart = el.scrollTop < 1;
			atScrollEnd = el.scrollTop + el.clientHeight > el.scrollHeight - 1;

			if (!atScrollStart && !atScrollEnd) {
				if (!scrollMiddleTouchEnded) {
					e.currentTarget.parentElement?.dispatchEvent(
						new CustomEvent('touchend', {
							bubbles: true,
							detail: {
								noInertia: true
							}
						})
					);
					scrollMiddleTouchEnded = true;
				}
			} else {
				scrollMiddleTouchEnded = false;
			}
		}
	}}
	onwheel={(e) => {
		usingTouch = false;
		if (e.ctrlKey || !mouseIn) return;
		const el = e.currentTarget;
		const isScrollingUp = e.deltaY < 0;
		const isScrollingDown = e.deltaY > 0;

		if (
			(isScrollingUp && el.scrollTop < 1) ||
			(isScrollingDown && el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
		) {
			if (Math.abs(e.deltaY) <= prevDelta) {
				e.stopPropagation();
			} else mouseIn = false;
		} else {
			e.stopPropagation();
		}
		prevDelta = Math.abs(e.deltaY);
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
