<script lang="ts">
	let { isMobile = $bindable() } = $props<{ isMobile?: boolean }>();

	let windowWidth = $state(0);
	$effect(() => {
		isMobile = windowWidth < 600;
	});
</script>

<svelte:window bind:innerWidth={windowWidth} />
