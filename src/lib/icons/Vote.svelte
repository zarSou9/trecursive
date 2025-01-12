<script lang="ts">
	interface Props {
		size: string;
		voted?: any;
		up: boolean;
	}

	let { size, voted = undefined, up }: Props = $props();

	let hovering = $state(false);
</script>

<svg
	role="presentation"
	onmouseenter={() => (hovering = true)}
	onmouseleave={() => (hovering = false)}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M14.9991 19L9.83911 14C9.56672 13.7429 9.34974 13.433 9.20142 13.0891C9.0531 12.7452 8.97656 12.3745 8.97656 12C8.97656 11.6255 9.0531 11.2548 9.20142 10.9109C9.34974 10.567 9.56672 10.2571 9.83911 10L14.9991 5"
		stroke={(voted === 1 && up) || (voted === -1 && !up)
			? up
				? '#80ff82'
				: '#f06767'
			: hovering
				? '#ebebeb'
				: '#b1b1b1'}
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
