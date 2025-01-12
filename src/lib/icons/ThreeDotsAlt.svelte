<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '20' }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<circle cx="12" cy="5" r="1" />
	<circle cx="12" cy="12" r="1" />
	<circle cx="12" cy="19" r="1" />
</svg>
