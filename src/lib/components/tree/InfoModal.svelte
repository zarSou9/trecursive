<script lang="ts">
	import Cross from '$lib/icons/Cross.svelte';

	interface Props {
		open: () => void;
		onClose?: () => void;
	}

	let { open = $bindable(), onClose }: Props = $props();

	open = () => {
		modalVisible = true;
	};

	let modalVisible = $state(false);

	function close() {
		modalVisible = false;
		onClose?.();
	}

	function handleKeyDown(e: KeyboardEvent) {
		e.stopPropagation();
		if (e.key === 'Escape') close();
	}
</script>

{#if modalVisible}
	<div
		onwheel={(e) => e.preventDefault()}
		onkeydown={handleKeyDown}
		class="modal-background backdrop-blur-sm"
		onclick={close}
		role="presentation"
	>
		<div
			class="modal-content flex flex-col items-center rounded-md border-b-[1px] border-l-[1px] border-[#747474] bg-[#282a31fc] px-6 pb-7 pt-4 text-[#e0e0e0]"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<button
				onclick={close}
				class="absolute right-[6px] top-[6px] flex size-[24px] items-center justify-center rounded-md transition-colors hover:bg-[#5f5f5f4f]"
			>
				<Cross size="16px" color="#c3c3c3" />
			</button>
			<h2 class="text-[24px] font-semibold">How To Use</h2>
			<div>
				<ul class="mt-4 list-disc space-y-4 pl-[25px]">
					<li>
						<p class="font-medium">Navigate Tree</p>
						<ul class="mt-2 list-disc space-y-2 pl-[25px]">
							<li>Arrow Keys</li>
						</ul>
					</li>
					<li>
						<p class="font-medium">Pan</p>
						<ul class="mt-2 list-disc space-y-2 pl-[25px]">
							<li>Two fingers on trackpad</li>
							<li>Click and drag (<kbd>alt</kbd> to disable)</li>
							<li><kbd>WASD</kbd></li>
						</ul>
					</li>
					<li>
						<p class="font-medium">Zoom</p>
						<ul class="mt-2 list-disc space-y-2 pl-[25px]">
							<li>Ctrl + Scroll</li>
							<li><kbd>-</kbd> | <kbd>+</kbd></li>
						</ul>
					</li>
				</ul>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: #00000062;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 300;
	}

	.modal-content {
		position: relative;
	}
</style>
