<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		className?: string;
		children?: Snippet;
	}

	let { className = '', children }: Props = $props();
</script>

<p class="xs text-[#8b8b8b] {className}">
	{@render children?.()}
</p>
