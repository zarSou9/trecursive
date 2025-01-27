<script lang="ts">
	import { slide } from 'svelte/transition';
	import Chevron from '$lib/icons/FolderArrow.svelte';
	import ToolTipItem from '$lib/components/general/ToolTipItem.svelte';
	import type { Paper } from '$lib/types';

	interface Props {
		papers: Paper[];
		className?: string;
		fontSize?: number;
		includeSource?: boolean;
	}

	let { papers, fontSize = 13.5, className = '', includeSource = false }: Props = $props();

	let hoveredItem = $state('');
	let containerDiv: HTMLDivElement | undefined = $state();
	let abstractsShown: Record<string, boolean> = $state({});
	let paperListElements: { [id: string]: HTMLDivElement | undefined } = $state({});

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
	}

	const sourceTitles = [
		{
			url: 'lesswrong.com',
			title: 'LessWrong'
		},
		{
			url: 'alignmentforum.org',
			title: 'Alignment Forum'
		},
		{
			url: 'arxiv.org',
			title: 'ArXiv'
		}
	];

	function getSourceTitle(url: string) {
		for (let sourceTitle of sourceTitles) {
			if (url.includes(sourceTitle.url)) return sourceTitle.title;
		}
		return new URL(url).hostname.replace('www.', '');
	}
</script>

<div
	style="font-size: {fontSize}px"
	class="w-full {papers.length ? 'pb-[15px]' : 'p-[15px]'} className"
>
	<div class="relative w-full" bind:this={containerDiv}>
		{#if papers.length}
			{#each papers as paper (paper.url)}
				<div
					bind:this={paperListElements[paper.url]}
					role="presentation"
					onmouseenter={() => (hoveredItem = paper.url)}
					onmouseleave={() => (hoveredItem = '')}
					class="relative flex-1 border-b-[.7px] border-[#7f7f7f] px-8 py-[30px]"
				>
					<div class="flex items-center justify-between">
						<a
							href={paper.url}
							target="_blank"
							rel="noopener noreferrer"
							class="pr-[20px] text-[15px] font-[450] text-[#e0e0e0] hover:underline"
						>
							{paper.title}
						</a>
					</div>
					<div class="mt-2 flex flex-wrap items-center gap-[18px] text-[#adadad]">
						{#if paper.published_date !== undefined}
							<ToolTipItem tooltip="Date Published<br />{paper.published_date.split('T')[0]}">
								<div class="whitespace-nowrap text-[12px] font-medium">
									{formatDate(paper.published_date)}
								</div>
							</ToolTipItem>
						{/if}
						{#if paper.citation_count !== undefined}
							<div class="flex items-center space-x-2">
								{#if paper.citation_count !== undefined}
									<div class="flex items-center text-[12px] font-medium">
										{paper.citation_count} Citations
									</div>
								{/if}
							</div>
						{/if}
						{#if includeSource}
							<ToolTipItem tooltip="Source" containerClassName="cursor-auto">
								<a
									href={new URL(paper.url).origin}
									rel="noopener noreferrer"
									target="_blank"
									class="whitespace-nowrap text-[12px] font-medium"
								>
									{getSourceTitle(paper.url)}
								</a>
							</ToolTipItem>
						{/if}
						{#if paper.summary && paper.abstract}
							<button
								onclick={() => (abstractsShown[paper.url] = !abstractsShown[paper.url])}
								class="flex items-center fill-[#adadad] text-[12px] font-medium"
							>
								Abstract
								<div
									class="ml-1 transition-transform {abstractsShown[paper.url]
										? '-rotate-90'
										: 'rotate-90'}"
								>
									<Chevron size="16px" />
								</div>
							</button>
						{/if}
					</div>
					{#if (abstractsShown[paper.url] || !paper.summary) && paper.abstract}
						<div transition:slide={{ duration: 150 }} class="mt-[21px] flex">
							<div
								class="w-full rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] px-4 py-3 shadow-md"
							>
								<div class="line-clamp-[18] text-[13px] text-[#d0d0d0]">
									{paper.abstract}
								</div>
							</div>
						</div>
					{/if}
					<div class="mt-[15px] flex">
						<div class="mr-auto space-y-[18px] text-[13.5px] text-[#d0d0d0]">
							{paper.summary}
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
