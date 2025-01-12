<script lang="ts">
	interface Props {
		className?: string;
		children?: import('svelte').Snippet;
	}

	let { className = '', children }: Props = $props();
</script>

<p class="xs text-[#8b8b8b] {className}">
	{@render children?.()}
</p>
