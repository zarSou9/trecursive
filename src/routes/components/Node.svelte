<script lang="ts">
	import BreakLine from '$lib/components/general/BreakLine.svelte';
	import CanvasScrollContainer from '$lib/components/tree/CanvasScrollContainer.svelte';
	import Note from '$lib/components/general/Note.svelte';
	import ReferenceList from '$lib/components/tree/ReferenceList.svelte';
	import type { Node, MiniMiddle } from '$lib/types';
	import { textToHTML } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

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
		goalHeight: number;
		onMiniClick: (miniNode: Node) => void;
	}

	let {
		node,
		collapsedNodes,
		containerDiv,
		totalWidth,
		totalHeight,
		setMiniMiddles,
		setMiniDivHeight,
		nodeAction,
		onDescriptionClick,
		subHighlighted = '',
		goalHeight,
		note = false,
		onMiniClick
	}: Props = $props();

	let miniDivs: { [id: string]: HTMLDivElement } = $state({});
	let questionsOpen = $state(true);
	let refsOpen = $state(true);
	let miniDivHeight = $state(0);

	$effect(() => {
		setMiniDivHeight(miniDivHeight);
	});

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

<div>
	<div class="flex h-fit flex-col items-center">
		<CanvasScrollContainer
			styleName="max-height: {goalHeight - 300}px;"
			className="rounded-[30px] max-w-[calc(100vw-40px)] md:max-w-[700px] h-fit border-b-[2px] border-l-[2px] border-gray-600 bg-[#212121] px-8 py-7"
			onclick={onDescriptionClick}
		>
			{#if node.research_questions}
				<div class="group absolute right-[calc(100%+55px)] top-0 size-fit w-[550px] flex-shrink-0">
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

		{#if node.breakdown?.explanation}
			<div class="relative mt-20 max-w-[700px] rounded-[30px] bg-[#212121] px-8 py-6">
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
						<a class="link text-sm text-[#7f7f7f]" href={node.breakdown.paper.url}>
							{node.breakdown.paper.url}
						</a>
					{:else}
						<a
							target="_blank"
							href={node.breakdown.paper.url}
							class="link-alt text-[16px] font-medium sm:text-[19px]"
						>
							{node.breakdown.paper.title}
						</a>
					{/if}
				{:else}
					<p class="header">{node.breakdown.title || 'Plan'}</p>
				{/if}
				<p class="mt-4">{@html textToHTML(node.breakdown.explanation)}</p>
			</div>
		{/if}
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
						<p class="sm mt-4 line-clamp-[15] text-gray-200">
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
