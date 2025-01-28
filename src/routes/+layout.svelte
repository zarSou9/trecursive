<script lang="ts">
	import '../app.css';
	import { setContext, onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Writable } from 'svelte/store';

	import Cross from '$lib/icons/Cross.svelte';
	import PopUp from '$lib/components/general/PopUp.svelte';
	import IsMobile from '$lib/components/general/IsMobile.svelte';

	const successPopUp = writable(false as string | false);
	setContext('successPopUpStore', successPopUp);
	const failurePopUp = writable(false as string | false);
	setContext('failurePopUpStore', failurePopUp);
	const tipPopUp = writable(false as string | false);
	setContext('tipPopUpStore', tipPopUp);
	const isMobile = writable(false);
	setContext('isMobileStore', isMobile);
	const usingCanvasTouch = writable(false);
	setContext('usingCanvasTouchStore', usingCanvasTouch);

	let { children } = $props();

	let prevTimeout: number | undefined;

	onMount(() => {
		let searchParams = new URLSearchParams(window.location.search);
		if (searchParams.has('error')) failurePopUp.set(searchParams.get('error') as string);
		else if (searchParams.has('success')) successPopUp.set(searchParams.get('success') as string);
	});

	function popupWait(popup: Writable<string | false>, timeout = 6400) {
		if (prevTimeout) clearTimeout(prevTimeout);
		prevTimeout = setTimeout(() => popup.set(false), timeout);
		return true;
	}
</script>

<IsMobile bind:isMobile={$isMobile} />

{#if $tipPopUp && popupWait(tipPopUp)}
	<PopUp
		position="bottom-left"
		onmouseenter={() => clearTimeout(prevTimeout)}
		onmouseleave={() => popupWait(tipPopUp, 600)}
	>
		<div
			class="flex items-center rounded-lg border-l-4 border-emerald-400 bg-white px-6 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
		>
			<div class="flex-1">
				<p class="font-medium text-gray-800">{$tipPopUp}</p>
			</div>
			<button
				class="ml-4 rounded-full p-1.5 transition-colors hover:bg-gray-100"
				onclick={(e) => {
					e.stopPropagation();
					$tipPopUp = false;
				}}
			>
				<Cross color="#6B7280" size="14px" />
			</button>
		</div>
	</PopUp>
{/if}

{#if $successPopUp && popupWait(successPopUp)}
	<PopUp
		onmouseenter={() => clearTimeout(prevTimeout)}
		onmouseleave={() => popupWait(successPopUp, 600)}
	>
		<div class="flex rounded-[6px] bg-[#ffffff] py-[10px]" style="box-shadow: 4px 4px #4ad36c;">
			<p class="ml-[25px] mr-[20px] text-[#000000]">{$successPopUp}</p>
			<button
				class="mr-[15px]"
				onclick={(e) => {
					e.stopPropagation();
					$successPopUp = false;
				}}
			>
				<Cross color="#70747c" size="16px" />
			</button>
		</div>
	</PopUp>
{/if}
{#if $failurePopUp && popupWait(failurePopUp)}
	<PopUp
		onmouseenter={() => clearTimeout(prevTimeout)}
		onmouseleave={() => popupWait(failurePopUp, 600)}
	>
		<div class="flex rounded-[6px] bg-[#ffffff] py-[10px]" style="box-shadow: 4px 4px #be4141;">
			<p class="ml-[25px] mr-[20px] text-[#000000]">{$failurePopUp}</p>
			<button
				class="mr-[15px]"
				onclick={(e) => {
					e.stopPropagation();
					$failurePopUp = false;
				}}
			>
				<Cross color="#70747c" size="16px" />
			</button>
		</div>
	</PopUp>
{/if}

<div class="h-[100dvh] w-screen overflow-auto {$usingCanvasTouch ? 'mobile-canvas' : ''}">
	{@render children?.()}
</div>

<style>
	.mobile-canvas {
		touch-action: none;
		-webkit-touch-callout: none;
		-webkit-tap-highlight-color: transparent;
		-webkit-user-select: none;
		user-select: none;
		overflow: hidden;
		overscroll-behavior: none;
		position: fixed;
	}
</style>
