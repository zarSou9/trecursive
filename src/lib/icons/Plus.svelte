<script lang="ts">
	interface Props {
		color: string;
		size: string;
		className?: string;
	}

	let { color, size, className = '' }: Props = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g
		id="SVGRepo_tracerCarrier"
		stroke-linecap="round"
		stroke-linejoin="round"
	></g><g id="SVGRepo_iconCarrier">
		<path
			d="M4 12H20M12 4V20"
			stroke={color}
			stroke-width="1.6799999999999997"
			stroke-linecap="round"
			stroke-linejoin="round"
		></path>
	</g></svg
>
