<script lang="ts">
	import { twMerge } from 'tailwind-merge';

	type Props = {
		options: string[];
		value: string;
		className?: string;
	};

	let { value = $bindable(), options, className = '' }: Props = $props();
</script>

<select
	bind:value
	class={twMerge(
		'bg-[#393b42] text-gray-300 text-[13px] rounded pr-[6px] pl-[2px] py-1 outline-none focus:ring-2 focus:ring-blue-500',
		className
	)}
>
	{#each options as option}
		<option value={option}>{option}</option>
	{/each}
</select>
