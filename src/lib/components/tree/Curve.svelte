<script lang="ts">
	interface Props {
		height: number;
		width: number;
		pointA?: { x: number; y: number };
		pointB?: { x: number; y: number };
		flow?: 'down' | 'horizontal' | 'left' | 'right';
		strokeWidth?: number;
		strokeColor?: string;
	}

	let {
		height,
		width,
		pointA = { x: 0, y: 0 },
		pointB = { x: 0, y: 0 },
		flow = 'down',
		strokeWidth = 1,
		strokeColor = '#9a9a9a'
	}: Props = $props();

	if (flow === 'horizontal') {
		if (pointA.x > pointB.x) flow = 'left';
		else flow = 'right';
	}

	let controlDistance = $derived(
		flow === 'down' ? Math.abs(pointA.y - pointB.y) / 1.5 : Math.abs(pointA.x - pointB.x) / 1.5
	);
	let controlPointB = $derived(
		flow === 'down'
			? { x: pointB.x, y: pointB.y - controlDistance }
			: flow === 'right'
				? { x: pointB.x - controlDistance, y: pointB.y }
				: { x: pointB.x + controlDistance, y: pointB.y }
	);
	let controlPointA = $derived(
		flow === 'down'
			? { x: pointA.x, y: pointA.y + controlDistance }
			: flow === 'right'
				? { x: pointA.x + controlDistance, y: pointA.y }
				: { x: pointA.x - controlDistance, y: pointA.y }
	);
	let pathData = $derived(
		`M ${pointB.x},${pointB.y} C ${controlPointB.x},${controlPointB.y} ${controlPointA.x},${controlPointA.y} ${pointA.x},${pointA.y}`
	);
</script>

{#if pathData && (pointA.x || pointA.y) && (pointB.x || pointB.y)}
	<div class="pointer-events-none absolute left-0 right-0">
		<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
			<path d={pathData} stroke={strokeColor} fill="none" stroke-width="{strokeWidth}px" />
		</svg>
	</div>
{/if}
