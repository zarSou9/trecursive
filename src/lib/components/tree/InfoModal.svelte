<script lang="ts">
	import Modal from '$lib/components/general/Modal.svelte';

	interface Props {
		open: () => void;
		onClose?: () => void;
	}

	let { open = $bindable(), onClose }: Props = $props();
	open = () => {
		modalVisible = true;
	};

	let modalVisible = $state(false);
</script>

{#if modalVisible}
	<Modal
		onClose={() => {
			modalVisible = false;
			onClose?.();
		}}
		useCross
		closeOnOutsideClick
		useAlt
		onwheel={(e) => {
			e.preventDefault();
		}}
	>
		<div class="flex flex-col items-center pb-3 pt-1 text-[#e0e0e0] sm:px-5 sm:py-3">
			<h2 class="mb-6 text-[24px] font-semibold">How To Use</h2>

			<div class="flex w-full max-w-[400px] flex-col gap-6">
				<div>
					<h3 class="mb-2 text-[18px] font-medium">Navigation Modes</h3>
					<p class="text-[#c3c3c3]">
						Switch between Default and Titles mode using the dropdown menu in the top right or press <span
							class="rounded bg-[#3a3a3a] px-1.5 py-0.5">T</span
						>
					</p>
				</div>

				<div>
					<h3 class="mb-2 text-[18px] font-medium">Default Mode</h3>
					<p class="text-[#c3c3c3]">Navigate the tree by:</p>
					<ul class="ml-5 mt-1 list-disc text-[#c3c3c3]">
						<li>Arrow keys</li>
						<li>Clicking on nodes</li>
					</ul>
				</div>

				<div>
					<h3 class="mb-2 text-[18px] font-medium">Titles Mode</h3>
					<p class="text-[#c3c3c3]">Hover over titles to view their descriptions</p>
				</div>
			</div>
		</div>
	</Modal>
{/if}
