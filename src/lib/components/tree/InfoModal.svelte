<script lang="ts">
	import Modal from '$lib/components/general/Modal.svelte';

	interface Props {
		open: () => void;
		onClose?: (dontShowAgain: boolean) => void;
	}

	let { open = $bindable(), onClose }: Props = $props();
	open = () => {
		modalVisible = true;
	};

	function close(dontShowAgain = false) {
		modalVisible = false;
		onClose?.(dontShowAgain);
	}

	let modalVisible = $state(false);
</script>

{#if modalVisible}
	<Modal
		onClose={close}
		useCross
		closeOnOutsideClick
		useAlt
		onwheel={(e) => {
			e.preventDefault();
		}}
	>
		<div class="flex flex-col items-center pb-3 pt-1 text-[#e0e0e0] sm:pb-3 sm:pt-2">
			<h2 class="mb-5 text-[24px] font-semibold">How To Use</h2>

			<div class="flex w-full max-w-[400px] flex-col gap-5 text-[15px]">
				<div>
					<p class="text-[#c3c3c3]">
						This is an interactive tree-map designed for complex research fields. It features a
						Default and Titles mode. Switch between them by <span class="font-semibold"
							>pressing</span
						> <span class="rounded bg-[#3a3a3a] px-1.5 py-0.5">T</span>
						or through the <span class="font-semibold">top right drop-down menu</span>
					</p>
				</div>

				<div>
					<h3 class="mb-2 text-[17px] font-medium">Default Mode</h3>
					<p class="text-[#c3c3c3]">Navigate the tree by:</p>
					<ul class="ml-5 mt-1 list-disc text-[#c3c3c3]">
						<li><span class="font-semibold">Arrow keys</span></li>
						<li>Clicking on nodes</li>
					</ul>
				</div>
				<div>
					<h3 class="mb-2 text-[17px] font-medium">Titles Mode</h3>
					<p class="text-[#c3c3c3]">Hover over titles to view their descriptions</p>
				</div>
			</div>
			<button
				class="mt-6 text-[#acacac] transition-colors hover:text-[#e0e0e0]"
				onclick={() => close(true)}
			>
				Don't show this again
			</button>
		</div>
	</Modal>
{/if}
