<script lang="ts">
	import CheckBox from './CheckBox.svelte';
	import type { SettingComponent } from '$lib/types';
	import Modal from './Modal.svelte';
	import Select from './Select.svelte';

	interface Props {
		onClose: () => void;
		onSave: (settings: SettingComponent[]) => void;
		settings: SettingComponent[];
	}

	let { onClose, onSave, settings = $bindable() }: Props = $props();
</script>

<Modal {onClose} closeOnOutsideClick useCross={false} useAlt>
	<div class="size-full">
		<h2 class="mb-4 text-2xl font-semibold">Settings</h2>
		<div>
			{#each settings as setting}
				<div class="flex items-center justify-between">
					<span class="text-gray-300">{setting.title}</span>
					{#if setting.type === 'check-box'}
						<CheckBox bind:checked={setting.value} className="flex-shrink-0" />
					{:else if setting.type === 'drop-down'}
						<Select bind:value={setting.value} options={setting.options} />
					{/if}
				</div>
				{#if setting.note}
					<p class="mt-1 text-sm text-gray-500">{setting.note}</p>
				{/if}
			{/each}
		</div>

		<div class="mt-6 flex justify-end">
			<button onclick={onClose} class="mr-2 px-4 py-2 text-gray-300 hover:text-white">
				Cancel
			</button>
			<button
				onclick={() => {
					onSave(settings);
					onClose();
				}}
				class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			>
				Save
			</button>
		</div>
	</div>
</Modal>
