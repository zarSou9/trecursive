<script lang="ts">
	import SettingsModal from '$lib/components/general/SettingsModal.svelte';
	import type { SettingComponent } from '$lib/types';
	import type { Writable } from 'svelte/store';

	interface Props {
		onClose: () => void;
		isUsingMouse: Writable<boolean>;
	}

	let { isUsingMouse, onClose }: Props = $props();

	let settings: SettingComponent[] = $state([
		{
			id: 'inputDevice',
			title: 'Input device',
			note: 'Map controls adapt based on input device',
			type: 'drop-down',
			value: $isUsingMouse ? 'Mouse' : 'Trackpad',
			options: ['Mouse', 'Trackpad']
		}
	]);
	isUsingMouse.subscribe((value) => {
		settings[0].value = value ? 'Mouse' : 'Trackpad';
	});
</script>

<SettingsModal
	bind:settings
	{onClose}
	onSave={(settings) => isUsingMouse.set(settings[0].value === 'Mouse')}
/>
