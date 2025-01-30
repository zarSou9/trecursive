<script lang="ts">
	import BreakLine from '$lib/components/general/BreakLine.svelte';
	import CanvasScrollContainer from '$lib/components/tree/CanvasScrollContainer.svelte';
	import Note from '$lib/components/general/Note.svelte';
	import PapersList from '$lib/components/tree/PapersList.svelte';
	import type { Node, MiniMiddle, Paper } from '$lib/types';
	import { textToHTML } from '$lib/utils';
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';
	import SearchDropdown from '$lib/components/tree/SearchDropdown.svelte';
	import FolderArrow from '$lib/icons/FolderArrow.svelte';
	import { slide } from 'svelte/transition';
	import { isNodeEmpty } from '$lib/treeLogic';
	import type { SvelteSet } from 'svelte/reactivity';

	interface Props {
		node: Node;
		setDescriptionDivHeight: (h: number) => void;
		note?: false | string;
		collapsedNodes: SvelteSet<string>;
		leftSidePanelInitOpen?: boolean;
		containerDiv: HTMLDivElement | undefined;
		totalWidth: number;
		totalHeight: number;
		setMiniMiddles: (m: MiniMiddle[]) => void;
		setMiniDivHeight: (h: number) => void;
		nodeAction: Writable<null | string>;
		handleNavNode: (nav: { id: string; breakdownSection?: boolean; leftPanel?: boolean }) => void;
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
		setDescriptionDivHeight,
		collapsedNodes,
		leftSidePanelInitOpen = false,
		containerDiv,
		breakdownName,
		totalWidth,
		totalHeight,
		setMiniMiddles,
		setMiniDivHeight,
		nodeAction,
		handleNavNode,
		subHighlighted = '',
		goalHeight,
		note = false,
		onMiniClick,
		loadTree
	}: Props = $props();

	const isMobile: Writable<boolean> = getContext('isMobileStore');

	let miniDivs: { [id: string]: HTMLButtonElement } = $state({});
	let leftPanelOpen = $state(leftSidePanelInitOpen);
	let rightBreakdownPanelOpen = $state(true);
	let miniDivHeight = $state(0);
	let searchInput = $state('');
	let searchExpanded = $state(false);
	let abstractShown = $state(false);
	let descriptionDiv: HTMLDivElement | undefined = $state();

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
				if (action === 'update-after-refresh') {
					updateMiniSubMiddles();
					setDescriptionDivHeight(descriptionDiv?.clientHeight || 0);
				} else if (action.startsWith('open-left-panel-') && action.endsWith(node.id)) {
					leftPanelOpen = true;
				}
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
	function formatDate(dateString: string, only_year = false) {
		const date = new Date(dateString);
		return date.toLocaleDateString(
			'en-US',
			only_year ? { year: 'numeric' } : { year: 'numeric', month: 'short' }
		);
	}
</script>

{#snippet collapser(onclick: () => void, open: boolean, right = true)}
	<button
		{onclick}
		aria-label="Collapse questions"
		class="absolute top-[-13px] z-10 rounded-full p-3 outline-none transition-all hover:bg-[#535e6f96] group-hover:opacity-100 {open
			? 'opacity-0'
			: 'rotate-180 bg-[#535e6f55]'} {right ? 'right-[-13px]' : 'left-[-13px]'}"
	>
		<div
			class="relative top-[1px] size-[9px] border-t-[1.4px] border-[#9b9b9b] transition-colors {right
				? 'right-[1px] rounded-tr-sm border-r-[1.4px]'
				: 'left-[1px] rounded-tl-sm border-l-[1.4px]'}"
		></div>
	</button>
{/snippet}

{#snippet paperMetaData(paper: Paper, showLink = false)}
	<div class="mt-3 flex items-center gap-[10px] text-[14px] text-gray-400">
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
		{#if paper.published_date}
			<span>•</span>
			<span class="line-clamp-1 flex-shrink-0">{formatDate(paper.published_date, $isMobile)}</span>
		{/if}
		{#if paper.citation_count && !$isMobile}
			<span>•</span>
			<span class="line-clamp-1 flex-shrink-0">{paper.citation_count} citations</span>
		{/if}
		{#if showLink}
			<span>•</span>
			<a href={paper.url} target="_blank" class="link line-clamp-1">{paper.title}</a>
		{/if}
	</div>
	{#if abstractShown}
		<div transition:slide={{ duration: 150 }} class="mt-3 flex">
			<div class="w-full rounded-lg border border-[#3a3a3a] bg-[#2b2b2b] px-4 py-3 shadow-md">
				<div class="text-[14.5px] leading-relaxed text-white/75">
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
			class="relative flex max-w-[calc(100vw-40px)] flex-col md:max-w-[700px]"
		>
			{#if node.questions?.length || node.papers?.length}
				<div
					onclick={(e) => e.stopPropagation()}
					role="presentation"
					class="group absolute right-[calc(100%+55px)] top-0 size-fit max-h-[100%] w-[550px] max-w-[calc(100vw-40px)] flex-shrink-0"
				>
					{@render collapser(() => (leftPanelOpen = !leftPanelOpen), leftPanelOpen)}
					{#if leftPanelOpen}
						<CanvasScrollContainer
							className="rounded-[30px] max-h-[470px] bg-[#191919] {node.papers ? '' : 'px-8 py-7'}"
							onclick={() => handleNavNode({ id: node.id, leftPanel: true })}
						>
							{#if node.papers}
								<p class="header mb-5 ml-8 mt-6">Related Papers</p>
								<BreakLine />
								<PapersList papers={node.papers} includeSource />
							{:else if node.questions}
								<h3 class="header mb-6">Open Research Questions</h3>
								<div class="flex flex-col gap-6">
									{#each node.questions as question}
										<div
											class="rounded-xl border border-[#3a3a3a] bg-[#1d1d1d] px-5 py-4 shadow-md transition-colors"
										>
											<p class="text-[15px] leading-relaxed text-[#e8e8e8]">{question.question}</p>
											{#if question.context}
												<Note className="mt-4">{question.context}</Note>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</CanvasScrollContainer>
					{/if}
				</div>
			{/if}

			<CanvasScrollContainer
				bind:element={descriptionDiv}
				className="relative rounded-[30px] min-h-[initial] border-b-[2px] border-l-[2px] border-gray-600 bg-[#212121] px-8 py-7 {node
					.breakdown?.explanation || node.breakdown?.paper
					? 'mb-8 overflow-visible'
					: 'mb-1'}"
				onclick={() => handleNavNode({ id: node.id })}
			>
				<h2 class="header">{node.title}</h2>
				<div class="description mt-4">
					{#if note}
						<em
							class="mb-4 block text-[14.5px] italic leading-relaxed text-white/60 [&>a]:text-[#829dbb] [&>a]:no-underline hover:[&>a]:underline"
							>{@html note}</em
						>
					{/if}
					{@html addPrettyLinks(
						(node.description || node.mini_description || '').replaceAll('\n', '<br>')
					)}
				</div>
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
									class="m-3 rounded-lg px-3 py-2 text-left text-[14.5px] text-gray-300 transition-colors hover:bg-[#2a2a2a]"
									onclick={() => {
										loadTree({ nodeID: node.id, breakdownID: breakdown.id });
										searchExpanded = false;
									}}
								>
									<div class="text-[15.5px] font-medium text-gray-200">
										{breakdown.title || breakdown.paper?.title}
									</div>
									{#if breakdown.paper && (breakdown.paper.published_date || breakdown.paper.citation_count)}
										<div class="mt-2 flex items-center gap-2.5 text-[13.5px] text-gray-500">
											{#if breakdown.paper.published_date}
												<span>{formatDate(breakdown.paper.published_date)}</span>
											{/if}
											{#if breakdown.paper.published_date && breakdown.paper.citation_count}
												<span>•</span>
											{/if}
											{#if breakdown.paper.citation_count}
												<span>{breakdown.paper.citation_count} citations</span>
											{/if}
										</div>
									{/if}
									<p class="mt-2 line-clamp-6 text-[14px] leading-relaxed text-gray-400">
										{breakdown.explanation || breakdown.paper?.abstract}
									</p>
								</button>
								<div class="mx-3 h-[.5px] bg-[#404040]"></div>
							{/each}
						{:else}
							<div class="px-6 py-5 text-[14.5px] text-gray-400">No results found</div>
						{/if}
					</CanvasScrollContainer>
				</SearchDropdown>
			{/if}
			{#if node.breakdown?.explanation || node.breakdown?.paper}
				<CanvasScrollContainer
					className="relative max-w-[700px] rounded-[30px] bg-[#212121] px-8 py-7"
					onclick={() => handleNavNode({ id: node.id, breakdownSection: true })}
				>
					<div class="">
						{#if node.breakdown.references}
							<div
								class="group absolute left-[calc(100%+55px)] top-0 size-fit h-[650px] max-h-[100%] w-[550px] flex-shrink-0"
							>
								{@render collapser(
									() => (rightBreakdownPanelOpen = !rightBreakdownPanelOpen),
									rightBreakdownPanelOpen,
									false
								)}
								{#if rightBreakdownPanelOpen}
									<CanvasScrollContainer className="rounded-[30px] size-full h-full bg-[#191919]">
										<p class="header mb-5 ml-8 mt-6">References</p>
										<BreakLine />
										<PapersList papers={node.breakdown.references} />
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
									<a target="_blank" href={node.breakdown.paper.url} class="link-alt header">
										{node.breakdown.paper.title}
									</a>
									{@render paperMetaData(node.breakdown.paper)}
								</div>
							{/if}
						{:else}
							<p class="header">{node.breakdown.title || 'Plan'}</p>
						{/if}
						{#if node.breakdown.explanation}
							<p class="description mt-4">
								{@html textToHTML(node.breakdown.explanation)}
							</p>
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
				style="max-width: {node.breakdown.sub_nodes.length * 500}px;"
				class="mt-14 grid h-fit grid-flow-col gap-14"
			>
				{#each node.breakdown.sub_nodes as subNode}
					<button
						bind:this={miniDivs[subNode.id]}
						disabled={isNodeEmpty(subNode) && collapsedNodes.has(subNode.id)}
						onclick={() => onMiniClick(subNode)}
						class="flex flex-col items-start overflow-hidden rounded-[25px] border-transparent bg-[#212121] px-[27px] text-left outline-none transition-colors
						{collapsedNodes.has(subNode.id)
							? `border-b-[2px] pb-[24px] pt-[22px] ${isNodeEmpty(subNode) ? '' : 'hover:border-b-neutral-400'}`
							: 'border-y-[2px] pb-[24px] pt-[20px] hover:border-t-neutral-400'}
							{subHighlighted === subNode.id ? 'border-b-neutral-400' : ''}"
					>
						<p class="text-[20px] font-medium tracking-tight">{subNode.title}</p>
						<p class="mt-3 line-clamp-[14] text-[15.5px] leading-relaxed text-gray-300">
							{subNode.mini_description || subNode.description}
						</p>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.header {
		font-size: 22px;
		font-weight: 500;
		line-height: 1.3;
		letter-spacing: -0.01em;
		color: rgba(255, 255, 255, 0.95);
	}

	.description {
		font-size: 15px;
		line-height: 1.65;
		color: rgba(255, 255, 255, 0.9);
	}

	@media (min-width: 640px) {
		.description {
			font-size: 16px;
		}
	}

	@media (max-width: 640px) {
		.header {
			font-size: 18px;
			line-height: 1.4;
		}
	}
</style>
