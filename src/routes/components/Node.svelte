<script lang="ts">
	import BreakLine from '$lib/components/general/BreakLine.svelte';
	import CanvasScrollContainer from '$lib/components/tree/CanvasScrollContainer.svelte';
	import Note from '$lib/components/general/Note.svelte';
	import ReferenceList from '$lib/components/tree/ReferenceList.svelte';
	import type { Node, MiniMiddle, Paper } from '$lib/types';
	import { textToHTML } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import SearchDropdown from '$lib/components/tree/SearchDropdown.svelte';
	import FolderArrow from '$lib/icons/FolderArrow.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		node: Node;
		note?: false | string;
		collapsedNodes: Writable<string[]>;
		containerDiv: HTMLDivElement | undefined;
		totalWidth: number;
		totalHeight: number;
		setMiniMiddles: (m: MiniMiddle[]) => void;
		setMiniDivHeight: (h: number) => void;
		nodeAction: Writable<null | string>;
		onDescriptionClick: () => void;
		subHighlighted?: string;
		breakdownName: string;
		goalHeight: number;
		onMiniClick: (miniNode: Node) => void;
		loadTree(
			selectBreakdown?:
				| undefined
				| {
						nodeID: string;
						breakdownID: string;
				  }
		): void;
	}

	let {
		node,
		collapsedNodes,
		containerDiv,
		breakdownName,
		totalWidth,
		totalHeight,
		setMiniMiddles,
		setMiniDivHeight,
		nodeAction,
		onDescriptionClick,
		subHighlighted = '',
		goalHeight,
		note = false,
		onMiniClick,
		loadTree
	}: Props = $props();

	let miniDivs: { [id: string]: HTMLDivElement } = $state({});
	let questionsOpen = $state(true);
	let refsOpen = $state(true);
	let miniDivHeight = $state(0);
	let searchInput = $state('');
	let searchExpanded = $state(false);
	let abstractShown = $state(false);

	function setAbstractShown(v: boolean) {
		if (abstractShown !== v) setTimeout(updateMiniSubMiddles, 150);
		abstractShown = v;
	}

	$effect(() => {
		setMiniDivHeight(miniDivHeight);
	});

	let breakdownResults = $derived(
		node.otherBreakdowns
			?.toSorted((a, b) =>
				(a.paper?.published_date || '') > (b.paper?.published_date || '') && a.sub_nodes.length
					? -1
					: 1
			)
			.filter((b) => b.title || b.paper?.title?.toLowerCase().includes(searchInput.toLowerCase()))
	);

	onMount(() => {
		return nodeAction.subscribe((action) => {
			if (action) {
				if (action === 'update-mini-middles') updateMiniSubMiddles();
				nodeAction.set(null);
			}
		});
	});

	function updateMiniSubMiddles() {
		const miniSubMiddles = [];
		const mainRect = containerDiv?.getBoundingClientRect();
		if (node.breakdown && mainRect) {
			for (let subNode of node.breakdown.sub_nodes) {
				const div = miniDivs[subNode.id];
				if (div) {
					const thisRect = div.getBoundingClientRect();
					const y =
						((thisRect.top + thisRect.height - mainRect.top) / (mainRect.height || 1)) *
						totalHeight;
					const x =
						((thisRect.left + thisRect.width / 2 - mainRect.left) / (mainRect.width || 1)) *
						totalWidth;
					miniSubMiddles.push({
						x,
						y,
						id: subNode.id
					});
				}
			}
		}
		if (miniSubMiddles.length) setMiniMiddles(miniSubMiddles);
	}

	function addPrettyLinks(html: string) {
		return html.replaceAll('<a', '<a class="pretty-link"');
	}
	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
	}
</script>

{#snippet collapser(onclick: () => void, open: boolean, right = true)}
	<button
		{onclick}
		aria-label="Collapse questions"
		class="absolute top-[-13px] z-10 rounded-full p-3 transition-all hover:bg-[#bbbbbb1c] group-hover:opacity-100 {open
			? 'opacity-0'
			: 'rotate-180 bg-[#bbbbbb13]'} {right ? 'right-[-13px]' : 'left-[-13px]'}"
	>
		<div
			class="relative top-[1px] size-[9px] border-t-[1.4px] border-neutral-500 transition-colors {right
				? 'right-[1px] rounded-tr-sm border-r-[1.4px]'
				: 'left-[1px] rounded-tl-sm border-l-[1.4px]'}"
		></div>
	</button>
{/snippet}

{#snippet paperMetaData(paper: Paper, showLink = false)}
	<div class="mt-1 flex items-center gap-[10px] text-[14px] text-gray-400">
		<button
			onclick={() => setAbstractShown(!abstractShown)}
			class="flex items-center fill-[#adadad]"
		>
			<div
				class="relative left-[-2px] mr-[2px] transition-transform {abstractShown
					? '-rotate-90'
					: 'rotate-90'}"
			>
				<FolderArrow size="16px" />
			</div>
			Abstract
		</button>
		<span>•</span>
		<span>{formatDate(paper.published_date)}</span>
		<span>•</span>
		<span>{paper.citation_count} citations</span>
		{#if showLink}
			<span>•</span>
			<a href={paper.url} target="_blank" class="link-alt">{paper.url}</a>
		{/if}
	</div>
	{#if abstractShown}
		<div transition:slide={{ duration: 150 }} class="mt-3 flex">
			<div class="w-full rounded-lg border border-[#3a3a3a] bg-[#292929] p-3 shadow-md">
				<div class="text-[13.5px] text-[#d0d0d0]">
					{paper.abstract}
				</div>
			</div>
		</div>
	{/if}
{/snippet}

<!-- svelte-ignore hydration_html_changed -->
<div>
	<div class="flex w-full justify-center">
		<div
			style="max-height: {goalHeight - 300}px;"
			class="flex max-w-[calc(100vw-40px)] flex-col md:max-w-[700px]"
		>
			<CanvasScrollContainer
				className="rounded-[30px] min-h-[initial] border-b-[2px] border-l-[2px] border-gray-600 bg-[#212121] px-8 py-7 {node
					.breakdown?.explanation || node.breakdown?.paper
					? 'mb-8 overflow-visible'
					: 'mb-1'}"
				onclick={onDescriptionClick}
			>
				{#if node.research_questions}
					<div
						class="group absolute right-[calc(100%+55px)] top-0 size-fit w-[550px] flex-shrink-0"
					>
						{@render collapser(() => (questionsOpen = !questionsOpen), questionsOpen)}
						{#if questionsOpen}
							<div class="rounded-[30px] bg-[#191919] px-8 py-6">
								<p class="header">Research Questions</p>
								<div class="mt-5 space-y-8">
									{#each node.research_questions as question}
										<div>
											<p>{question.question}</p>
											<Note className="mt-2">{question.context}</Note>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<p class="header">{node.title}</p>
				<p class="mt-4 text-[14px] sm:text-[16px]">
					{#if note}
						<em class="block pb-3 text-[13px] text-[#8b8b8b] [&>a]:text-[#829dbb]">{@html note}</em>
					{/if}
					{@html addPrettyLinks(node.description)}
				</p>
			</CanvasScrollContainer>
			{#if node.otherBreakdowns?.length}
				<SearchDropdown
					placeholder="Search other {breakdownName}s..."
					className="mb-3 ml-8"
					bind:value={searchInput}
					bind:expanded={searchExpanded}
				>
					<CanvasScrollContainer className="max-h-[400px]">
						{#if breakdownResults?.length}
							{#each breakdownResults as breakdown}
								<button
									class="m-2 rounded px-2 py-1.5 text-left text-[13px] text-gray-300 transition-colors hover:bg-[#222222]"
									onclick={() => {
										loadTree({ nodeID: node.id, breakdownID: breakdown.id });
										searchExpanded = false;
									}}
								>
									<div class="font-medium">{breakdown.title || breakdown.paper?.title}</div>
									{#if breakdown.paper}
										<div class="mt-1 flex items-center gap-2 text-[12px] text-gray-500">
											<span>{formatDate(breakdown.paper.published_date)}</span>
											<span>•</span>
											<span>{breakdown.paper.citation_count} citations</span>
										</div>
									{/if}
									<p class="mt-1.5 line-clamp-6 text-[12px] text-gray-400">
										{breakdown.explanation || breakdown.paper?.abstract}
									</p>
								</button>
								<div class="h-[.3px] bg-[#606060]"></div>
							{/each}
						{:else}
							<div class="px-2 py-3 text-[13px] text-gray-400">No results found</div>
						{/if}
					</CanvasScrollContainer>
				</SearchDropdown>
			{/if}
			{#if node.breakdown?.explanation || node.breakdown?.paper}
				<CanvasScrollContainer
					className="relative max-w-[700px] rounded-[30px] bg-[#212121] px-8 py-6"
				>
					<div class="">
						{#if node.breakdown.references}
							<div
								class="group absolute left-[calc(100%+55px)] top-0 size-fit h-[650px] max-h-[100%] w-[550px] flex-shrink-0"
							>
								{@render collapser(() => (refsOpen = !refsOpen), refsOpen, false)}
								{#if refsOpen}
									<CanvasScrollContainer className="rounded-[30px] size-full h-full bg-[#191919]">
										<p class="header mb-5 ml-8 mt-6">References</p>
										<BreakLine />
										<ReferenceList references={node.breakdown.references} />
									</CanvasScrollContainer>
								{/if}
							</div>
						{/if}

						{#if node.breakdown.paper}
							{#if node.breakdown.title}
								<p class="header">{node.breakdown.title || 'Plan'}</p>
								{@render paperMetaData(node.breakdown.paper, true)}
							{:else}
								<div>
									<a
										target="_blank"
										href={node.breakdown.paper.url}
										class="link-alt text-[16px] font-medium sm:text-[19px]"
									>
										{node.breakdown.paper.title}
									</a>
									{@render paperMetaData(node.breakdown.paper)}
								</div>
							{/if}
						{:else}
							<p class="header">{node.breakdown.title || 'Plan'}</p>
						{/if}
						{#if node.breakdown.explanation}
							<p class="mt-3">{@html textToHTML(node.breakdown.explanation)}</p>
						{/if}
					</div>
				</CanvasScrollContainer>
			{/if}
		</div>
	</div>
	{#if node.breakdown}
		<div class="flex w-full justify-center">
			<div
				bind:clientHeight={miniDivHeight}
				style="max-width: {node.breakdown.sub_nodes.length * 420}px;"
				class="mt-14 grid h-fit grid-flow-col gap-9"
			>
				{#each node.breakdown.sub_nodes as subNode}
					<div
						bind:this={miniDivs[subNode.id]}
						role="presentation"
						onclick={() => onMiniClick(subNode)}
						class="cursor-pointer overflow-hidden rounded-[25px] border-transparent bg-[#212121] px-6 text-left transition-colors
						{$collapsedNodes.includes(subNode.id)
							? 'border-b-[2px] py-[20px] hover:border-b-neutral-400'
							: 'border-y-[2px] pb-[20px] pt-[18px] hover:border-t-neutral-400'}
							{subHighlighted === subNode.id ? 'border-b-neutral-400' : ''}"
					>
						<p class="header">{subNode.title}</p>
						<p class="sm mt-4 line-clamp-[14] text-gray-200">
							{(subNode.mini_description?.[0].toUpperCase() || '') +
								(subNode.mini_description?.slice(1) || '') || subNode.description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.header {
		font-size: 21px;
		font-weight: 500;
	}

	@media (max-width: 640px) {
		.header {
			font-size: 18px;
		}
	}
</style>
