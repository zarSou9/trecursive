<script lang="ts">
	import {
		chooseBreakdowns,
		getAllCollapsed,
		getAllParentIDs,
		getNodeFromID,
		getParentNode,
		getSubNodes,
		isNodeEmpty,
		positionTree
	} from '$lib/treeLogic';
	import { writable, type Writable } from 'svelte/store';
	import { getContext, onMount, tick } from 'svelte';
	import type {
		Node as NodeType,
		PosNode,
		HashMap,
		TitlePosNode,
		TreeDefinition,
		TreeSettings
	} from '$lib/types';
	import { createLocalStore } from '$lib/createLocalStore';

	import Curve from '$lib/components/tree/Curve.svelte';
	import Node from './Node.svelte';
	import InfoModal from '$lib/components/tree/InfoModal.svelte';
	import InfiniteCanvas from './InfiniteCanvas.svelte';
	import { positionHorizontalTree } from '$lib/horizontalTreeLogic';
	import { mergeWithDefaults, mixColors, sendTipOnce } from '$lib/utils';
	import ToolTipItem from '$lib/components/general/ToolTipItem.svelte';
	import { defaultSettings } from '$lib/allTrees';

	const {
		title,
		pathName,
		tree: fullTree,
		note = '',
		customSettings = {},
		breakdownName = 'breakdown',
		disable_expand_all,
		leftSidePanelInitOpen,
		canvasPadding = 1500
	}: TreeDefinition = $props();

	const tipPopUp: Writable<string | false> = getContext('tipPopUpStore');
	const isMobile: Writable<boolean> = getContext('isMobileStore');

	let tree: NodeType | undefined = $state(undefined);

	const settings = mergeWithDefaults(defaultSettings, customSettings);

	let positionedNodes: PosNode[] = $state([]);
	let totalWidth = $state(0);
	let totalHeight = $state(0);

	let titlePositionedNodes: TitlePosNode[] = $state([]);
	let totalTitleWidth = $state(0);
	let totalTitleHeight = $state(0);
	let disableArrowNav = false;
	// let textw = $state(0);
	// let test = $state('');
	// $inspect(textw / test.length);

	let openModal = $state(() => {});
	let containerDiv: HTMLDivElement | undefined = $state();
	let navToNode: ((middle: number, top: number, dur?: number) => void) | undefined =
		$state(undefined);
	let lastNavedNode: {
		posNode?: PosNode;
		sub?: string;
		leftPanel?: boolean;
		breakdownSection?: boolean;
	} = $state({});
	let subHighlighted = $state('');
	let moveByOffset: ((offsetX: number, offsetY: number) => void) | undefined = $state(undefined);
	let goFullIfOut: (forceGoFull?: boolean) => void = $state(() => {});
	let useArrowsTipTimeout: undefined | number = $state(undefined);
	let titleModeTipTimeout: undefined | number = $state(undefined);
	const titlesMode = createLocalStore('titlesMode', false);

	const collapsedNodes = $state(
		createLocalStore(`collapsedNodesStore-${pathName}`, getAllCollapsed(fullTree))
	);
	const selectedBreakdowns = $state(
		createLocalStore(`selectedBreakdowns-${pathName}`, {} as HashMap)
	);
	collapsedNodes.set(getAllCollapsed(fullTree));

	const nodeAction = writable(null as null | string);

	onMount(loadTree);

	$effect(() => {
		const subNode = lastNavedNode.posNode?.node.breakdown?.sub_nodes.find(
			(sub) => lastNavedNode.sub === sub.id
		);
		if (subNode && !isNodeEmpty(subNode)) subHighlighted = lastNavedNode.sub || '';
		else subHighlighted = '';
	});

	function setCollapsed(collapsed: string[], centeredNodeID?: string, forceGoFull = false) {
		if (!tree) return;
		let prevCenteredPosNode;
		if (centeredNodeID) {
			prevCenteredPosNode = positionedNodes.find((pos) => pos.node.id === centeredNodeID);
			if (!prevCenteredPosNode) return;
		}
		collapsedNodes.set(collapsed);
		const positionedResult = positionTree(tree, collapsed, settings.defaultMode);

		positionedNodes = positionedResult.positionedNodes;
		totalHeight = positionedResult.totalHeight;
		totalWidth = positionedResult.totalWidth;

		if (prevCenteredPosNode) {
			const centeredPosNode = positionedNodes.find((pos) => pos.node.id === centeredNodeID);
			if (!centeredPosNode) return;
			const offsetX = (centeredPosNode.left || 0) - (prevCenteredPosNode.left || 0);
			const offsetY = (centeredPosNode.top || 0) - (prevCenteredPosNode.top || 0);
			moveByOffset?.(offsetX, offsetY);
		}

		setTimeout(() => {
			nodeAction.set('update-after-refresh');
			goFullIfOut(forceGoFull);
		}, 1);
	}
	function setTitlePosNodes() {
		const positionedResult = positionHorizontalTree(
			chooseBreakdowns(fullTree, $selectedBreakdowns, true),
			settings.titlesMode
		);

		titlePositionedNodes = positionedResult.positionedNodes;
		totalTitleHeight = positionedResult.totalHeight;
		totalTitleWidth = positionedResult.totalWidth + settings.titlesMode.widthAddition;

		setTimeout(() => goFullIfOut(), 1);

		// for (let posNode of titlePositionedNodes) {
		// 	test += posNode.node.title + ' ';
		// }
	}

	function loadTree(
		selectBreakdown: undefined | { nodeID: string; breakdownID: string } = undefined
	) {
		if (selectBreakdown) $selectedBreakdowns[selectBreakdown.nodeID] = selectBreakdown.breakdownID;
		tree = chooseBreakdowns(fullTree, $selectedBreakdowns);
		setCollapsed($collapsedNodes, selectBreakdown?.nodeID);
		setTitlePosNodes();
	}

	function getPosSubNodes(goal: NodeType): PosNode[] {
		const subNodes = getSubNodes(goal, $collapsedNodes);
		return subNodes
			.map((sub) => positionedNodes.find((p) => p.node.id === sub.id))
			.filter(Boolean) as PosNode[];
	}

	async function handleNavNode({
		id,
		sub,
		duration = 400,
		collapseSub = false,
		leftPanel = false,
		breakdownSection = false
	}: {
		id: string | undefined;
		sub?: string;
		duration?: number;
		collapseSub?: boolean;
		leftPanel?: boolean;
		breakdownSection?: boolean;
	}) {
		if ($titlesMode || disableArrowNav) return;
		let posNode = positionedNodes.find((pn) => pn.node.id === id);
		if (!posNode) {
			const allParents = getAllParentIDs(id, tree);
			setCollapsed($collapsedNodes.filter((collapsed) => !allParents.includes(collapsed)));
			await tick();
			posNode = positionedNodes.find((pn) => pn.node.id === id);
		}
		lastNavedNode = {
			posNode,
			sub,
			leftPanel,
			breakdownSection
		};
		if (lastNavedNode?.posNode) {
			if (sub) {
				const subPosNode = lastNavedNode.posNode.miniSubMiddles?.find((mini) => mini.id === sub);
				if (subPosNode) {
					navToNode?.(
						canvasPadding + subPosNode.x,
						canvasPadding + subPosNode.y - (lastNavedNode.posNode.miniDivHeight || 0) - 100,
						duration
					);
				}
			} else if (leftPanel) {
				const leftPanelWidth = Math.min(550, window.innerWidth - 40);
				const descriptionWidth = Math.min(700, window.innerWidth - 40);
				const descriptionLeft =
					canvasPadding +
					(lastNavedNode.posNode.left || 0) +
					settings.defaultMode.nodeWidth / 2 -
					descriptionWidth / 2;
				nodeAction.set(`open-left-panel-${posNode?.node.id}`);
				navToNode?.(
					descriptionLeft - 55 - leftPanelWidth / 2,
					canvasPadding + (lastNavedNode.posNode.top || 0) - 80,
					duration
				);
			} else if (breakdownSection) {
				navToNode?.(
					canvasPadding + (lastNavedNode.posNode.left || 0) + settings.defaultMode.nodeWidth / 2,
					canvasPadding +
						(lastNavedNode.posNode.top || 0) -
						80 +
						(lastNavedNode.posNode.descriptionDivHeight || 0) +
						32,
					duration
				);
			} else {
				navToNode?.(
					canvasPadding + (lastNavedNode.posNode.left || 0) + settings.defaultMode.nodeWidth / 2,
					canvasPadding + (lastNavedNode.posNode.top || 0) - 80,
					duration
				);
			}
		}
		if (collapseSub && sub && !$collapsedNodes.includes(sub)) {
			disableArrowNav = true;
			setTimeout(() => {
				disableArrowNav = false;
				if (!$collapsedNodes.includes(sub)) setCollapsed([...$collapsedNodes, sub], id);
			}, duration);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if ($titlesMode) return;
		if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
			clearTimeout(useArrowsTipTimeout);
			e.preventDefault();
			if (!lastNavedNode.posNode) {
				handleNavNode({ id: tree?.id });
				return;
			}
			const node = lastNavedNode.posNode.node;
			const allParentIDs = getAllParentIDs(node.id, tree);
			let isHidden = false;
			for (const parentID of allParentIDs) {
				if ($collapsedNodes.includes(parentID)) {
					isHidden = true;
				} else if (isHidden) {
					handleNavNode({ id: parentID });
					return;
				}
			}

			try {
				const lastParent = getParentNode(node.id, tree);
				let lastNodeIdx = lastParent?.breakdown?.sub_nodes.findIndex(
					(sub) => sub.id === lastNavedNode.posNode?.node.id
				);
				lastNodeIdx = lastNodeIdx === undefined ? -1 : lastNodeIdx;
				let lastSubNodeIdx = lastNavedNode.posNode?.node.breakdown?.sub_nodes?.findIndex(
					(sub) => sub.id === lastNavedNode.sub
				);
				lastSubNodeIdx = lastSubNodeIdx === undefined ? -1 : lastSubNodeIdx;

				if (e.key === 'ArrowLeft') {
					if (!node.breakdown) throw 'same';

					if (lastNavedNode.sub) {
						if (lastSubNodeIdx === -1) throw 'same';

						handleNavNode({
							id: node.id,
							sub: node.breakdown.sub_nodes[Math.max(0, lastSubNodeIdx - 1)].id
						});
					} else {
						if (node.questions?.length || node.papers?.length) {
							handleNavNode({
								id: node.id,
								leftPanel: true
							});
						} else {
							handleNavNode({
								id: node.id,
								sub: node.breakdown.sub_nodes[0].id
							});
						}
					}
				} else if (e.key === 'ArrowRight') {
					if (!node.breakdown) throw 'same';
					const l = node.breakdown.sub_nodes.length;
					if (lastNavedNode.sub) {
						if (lastSubNodeIdx === -1) throw 'same';
						handleNavNode({
							id: node.id,
							sub: node.breakdown.sub_nodes[Math.min(l - 1, lastSubNodeIdx + 1)].id
						});
					} else if (lastNavedNode.leftPanel) {
						handleNavNode({ id: node.id });
					} else if (
						!lastNavedNode.breakdownSection &&
						(node.breakdown?.explanation || node.breakdown?.paper)
					) {
						handleNavNode({ id: node.id, breakdownSection: true });
					} else {
						handleNavNode({
							id: node.id,
							sub: node.breakdown.sub_nodes[0].id
						});
					}
				} else if (e.key === 'ArrowUp') {
					if (lastNavedNode.sub) {
						if (node.breakdown?.explanation || node.breakdown?.paper) {
							handleNavNode({ id: node.id, breakdownSection: true });
						} else {
							handleNavNode({ id: node.id });
						}
					} else {
						if (!lastParent) throw 'same';
						if (lastNavedNode.breakdownSection) {
							handleNavNode({ id: node.id, breakdownSection: false });
						} else {
							handleNavNode({
								id: lastParent.id,
								sub: node.id,
								collapseSub: true
							});
						}
					}
				} else if (e.key === 'ArrowDown') {
					if (lastNavedNode.sub) {
						const subNode = node.breakdown?.sub_nodes.find((sub) => sub.id === lastNavedNode.sub);
						if (subNode && !isNodeEmpty(subNode)) handleNavNode({ id: lastNavedNode.sub });
					} else if (
						!lastNavedNode.breakdownSection &&
						(node.breakdown?.explanation || node.breakdown?.paper)
					) {
						handleNavNode({ id: node.id, breakdownSection: true });
					} else {
						handleNavNode({ id: node.id, sub: node.breakdown?.sub_nodes[0].id });
					}
				}
			} catch (e) {
				if (e === 'same') handleNavNode({ id: node.id, sub: lastNavedNode.sub });
				else throw e;
			}
		} else if (e.key === 'Enter' && subHighlighted) {
			handleNavNode({ id: subHighlighted });
		}
	}

	function toggleTitlesMode() {
		titlesMode.update((v) => {
			if (v) setTimeout(() => nodeAction.set('update-after-refresh'), 1);
			else clearTimeout(titleModeTipTimeout);
			return !v;
		});
	}

	async function onTitleClick(posNode: TitlePosNode) {
		toggleTitlesMode();
		await tick();
		handleNavNode({ id: posNode.node.id, duration: 0 });
		sendTipOnce('Press t to go back', tipPopUp, 500);
	}
</script>

<svelte:window onkeydown={handleKeyDown} onmousemove={() => (subHighlighted = '')} />

<!-- <div
	bind:clientWidth={textw}
	class="z-[1000] fixed top-[200px] left-[200px] whitespace-nowrap text-[18px] text-[#fff0]"
>
	{test}
</div> -->

<InfoModal bind:open={openModal} />

<div class="relative size-full">
	{#key $titlesMode}
		<InfiniteCanvas
			bind:goFullIfOut
			additionalCommands={[
				{
					title: $titlesMode ? 'Default Mode' : 'Titles Mode',
					key: 't',
					func: toggleTitlesMode
				},
				...($titlesMode
					? []
					: [
							{
								title: 'Collapse All',
								key: 'c',
								putAfter: true,
								func: () => tree && setCollapsed(getAllCollapsed(fullTree), undefined, true)
							},
							...(disable_expand_all
								? []
								: [
										{
											title: 'Expand All',
											shiftKey: true,
											putAfter: true,
											key: 'c',
											func: () => tree && setCollapsed([], undefined, true)
										}
									])
						])
			]}
			bind:moveByOffset
			bind:navToNode
			oninfo={openModal}
			coordsKey={pathName + $titlesMode}
			onModalsClosed={() => {
				if ($isMobile) return;
				useArrowsTipTimeout = sendTipOnce(
					'TIP: Use arrow keys to navigate the tree',
					tipPopUp,
					2800
				);
				titleModeTipTimeout = sendTipOnce('TIP: Press t to toggle titles view', tipPopUp, 10000);
			}}
		>
			{#if $titlesMode}
				<div class="p-[400px]">
					<div style="height: {totalTitleHeight}px; width: {totalTitleWidth}px;" class="relative">
						{#each titlePositionedNodes as titlePosNode (titlePosNode.node.id)}
							<div
								role="presentation"
								style="top: {titlePosNode.top}px; left: {titlePosNode.left}px; width: {settings
									.titlesMode.horizontalSpacing +
									(settings.titlesMode.horizontalSpacingAdditions[titlePosNode.depth] || 0) -
									20}px;"
								class="absolute"
							>
								<div class="absolute bottom-[calc(100%-.5px)] left-0 w-full">
									<ToolTipItem
										tooltip={(titlePosNode.node.mini_description?.[0].toUpperCase() || '') +
											(titlePosNode.node.mini_description?.slice(1) || '') ||
											titlePosNode.node.description}
										tooltipClassName="pt-2 max-w-[clamp(310px,83%,500px)]"
										toolTipContainerClassName="line-clamp-[12]"
										showOnHover={false}
										delay={250}
										style="font-size: {Math.min(
											18,
											Math.max(
												13,
												(
													settings.titlesMode.avgTextCharSizes[titlePosNode.depth] ||
													settings.titlesMode.defaultTitleCharSize
												).textSize * 0.7
											)
										)}px"
									>
										<button
											onclick={() => onTitleClick(titlePosNode)}
											style="width: {titlePosNode.children
												? titlePosNode.width
												: ''}px; font-size: {(
												settings.titlesMode.avgTextCharSizes[titlePosNode.depth] ||
												settings.titlesMode.defaultTitleCharSize
											).textSize}px;
										border-color: {titlePosNode.color};
										color: {mixColors(titlePosNode.color, 0.3)};
										--hover-color: {titlePosNode.color || '#badaff'}"
											class="whitespace-nowrap border-b-[1px] text-start no-underline transition-colors duration-150 hover:![color:var(--hover-color)]"
										>
											{titlePosNode.node.title}
										</button>
									</ToolTipItem>
								</div>
							</div>
							{#each titlePosNode.children || [] as subTitlePosNode (subTitlePosNode.node.id)}
								<Curve
									width={totalTitleWidth}
									height={totalTitleHeight}
									pointA={{
										x: (titlePosNode.left || 0) + titlePosNode.width,
										y: titlePosNode.top || 0
									}}
									pointB={{
										x: subTitlePosNode.left || 0,
										y: subTitlePosNode.top || 0
									}}
									flow="horizontal"
									strokeColor={titlePosNode.color}
									strokeWidth={1}
								/>
							{/each}
						{/each}
					</div>
				</div>
			{:else}
				<div style="padding: {canvasPadding}px">
					<div
						bind:this={containerDiv}
						style="height: {totalHeight}px; width: {totalWidth}px"
						class="relative"
					>
						{#each positionedNodes as posNode, i (posNode.node.id)}
							<div
								role="presentation"
								style="width: {settings.defaultMode.nodeWidth}px; height: {settings.defaultMode
									.nodeHeight}px; top: {posNode.top}px; left: {posNode.left}px"
								class="absolute"
							>
								{#if posNode.parent}
									<button
										class="absolute bottom-[calc(100%+9px)] left-[50%] translate-x-[-50%] border-t-[1px] border-[#939393] pt-[.5px] text-[13px] text-[#939393] outline-none transition-colors hover:border-[#ececec] hover:text-inherit"
										onclick={() => handleNavNode({ id: posNode.parent?.id })}
									>
										{posNode.parent?.title}
									</button>
								{/if}
								<Node
									node={posNode.node}
									setDescriptionDivHeight={(h) => (posNode.descriptionDivHeight = h)}
									note={posNode.node === tree && note}
									setMiniMiddles={(m) => (posNode.miniSubMiddles = m)}
									setMiniDivHeight={(h) => (posNode.miniDivHeight = h)}
									onDescriptionClick={() => handleNavNode({ id: posNode.node.id })}
									onMiniClick={(miniNode) => {
										if ($collapsedNodes.includes(miniNode.id)) {
											if (!isNodeEmpty(miniNode)) handleNavNode({ id: miniNode.id });
										} else {
											setCollapsed(
												[...$collapsedNodes, miniNode.id],
												getParentNode(miniNode.id, tree)?.id
											);
										}
									}}
									goalHeight={settings.defaultMode.nodeHeight}
									{leftSidePanelInitOpen}
									{collapsedNodes}
									{nodeAction}
									{subHighlighted}
									{containerDiv}
									{totalHeight}
									{breakdownName}
									{loadTree}
									{totalWidth}
								/>
							</div>
							{#each getPosSubNodes(posNode.node) as posSubNode (posSubNode.node.id)}
								<Curve
									width={totalWidth}
									height={totalHeight}
									pointA={posNode.miniSubMiddles?.find((mini) => mini.id === posSubNode.node.id)}
									pointB={{
										x: (posSubNode.left || 0) + settings.defaultMode.nodeWidth / 2,
										y: (posSubNode.top || 0) - 30
									}}
									strokeWidth={1.5}
									strokeColor="#939393"
								/>
							{/each}
						{/each}
					</div>
				</div>
			{/if}
		</InfiniteCanvas>
	{/key}
</div>
