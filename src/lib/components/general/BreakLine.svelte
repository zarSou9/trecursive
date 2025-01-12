<script lang="ts">
	interface Props {
		className?: string;
	}

	let { className = '' }: Props = $props();
</script>

<div class={className}>
	<div class="h-[.7px] bg-[#7f7f7f] w-full"></div>
</div>
