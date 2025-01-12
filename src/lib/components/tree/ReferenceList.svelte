<script lang="ts">
	import { slide } from 'svelte/transition';
	import Chevron from '$lib/icons/FolderArrow.svelte';
	import ToolTipItem from '$lib/components/general/ToolTipItem.svelte';
	import type { Paper } from '$lib/types';

	interface Props {
		references: Paper[];
		className?: string;
		fontSize?: number;
	}

	let { references, fontSize = 13.5, className = '' }: Props = $props();

	let hoveredItem = $state('');
	let containerDiv: HTMLDivElement | undefined = $state();
	let abstractsShown: Record<string, boolean> = $state({});
	let paperListElements: { [id: string]: HTMLDivElement | undefined } = $state({});

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
	}
</script>

<div
	style="font-size: {fontSize}px"
	class="w-full {references.length ? 'pb-[15px]' : 'p-[15px]'} className"
>
	<div class="relative w-full" bind:this={containerDiv}>
		{#if references.length}
			{#each references as reference (reference.ref)}
				<div
					bind:this={paperListElements[reference.ref]}
					role="presentation"
					onmouseenter={() => (hoveredItem = reference.ref)}
					onmouseleave={() => (hoveredItem = '')}
					class="relative flex-1 border-b-[.1px] border-[#7f7f7f] px-8 py-[30px]"
				>
					<div class="flex items-center justify-between">
						<a
							href={reference.url}
							target="_blank"
							rel="noopener noreferrer"
							class="truncate pr-[20px] text-[15px] font-[450] text-[#e0e0e0] hover:underline"
						>
							{reference.title}
						</a>
					</div>
					<div class="mt-[15px] flex flex-wrap items-center gap-[18px]">
						{#if reference.published_date !== undefined}
							<ToolTipItem tooltip="Date Published<br />{reference.published_date.split('T')[0]}">
								<div class="whitespace-nowrap text-[12px] font-medium text-[#adadad]">
									{formatDate(reference.published_date)}
								</div>
							</ToolTipItem>
						{/if}
						{#if reference.citation_count !== undefined}
							<div class="flex items-center space-x-2">
								{#if reference.citation_count !== undefined}
									<ToolTipItem
										tooltip="Citation Count<br />Total number of other papers that cited this paper"
									>
										<div class="flex items-center text-[12px] font-medium text-[#a0a0a0]">
											<span class="mr-1">📚</span>
											{reference.citation_count}
										</div>
									</ToolTipItem>
								{/if}
							</div>
						{/if}
						{#if reference.summary && reference.abstract}
							<button
								onclick={() => (abstractsShown[reference.ref] = !abstractsShown[reference.ref])}
								class="flex items-center fill-[#adadad] text-[12px] font-medium text-[#adadad]"
							>
								Abstract
								<div
									class="ml-1 transition-transform {abstractsShown[reference.ref]
										? '-rotate-90'
										: 'rotate-90'}"
								>
									<Chevron size="16px" />
								</div>
							</button>
						{/if}
					</div>
					{#if (abstractsShown[reference.ref] || !reference.summary) && reference.abstract}
						<div transition:slide={{ duration: 150 }} class="mt-[21px] flex">
							<div class="w-full rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] p-4 shadow-md">
								<div class="text-[13.5px] text-[#d0d0d0]">
									{reference.abstract}
								</div>
							</div>
						</div>
					{/if}
					<div class="mt-[21px] flex">
						<div class="mr-auto space-y-[18px] text-[13.5px] text-[#d0d0d0]">
							{reference.summary}
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
