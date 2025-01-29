<script lang="ts">
	import {
		chooseBreakdowns,
		getAllCollapsed,
		getAllParentIDs,
		getFullNodeFromID,
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
		HorizontalTreeSettings
	} from '$lib/types';
	import { createLocalStore } from '$lib/createLocalStore';

	import Curve from '$lib/components/tree/Curve.svelte';
	import Node from './Node.svelte';
	import InfoModal from '$lib/components/tree/InfoModal.svelte';
	import InfiniteCanvas from './InfiniteCanvas.svelte';
	import { getTitlePosNode, positionHorizontalTree } from '$lib/horizontalTreeLogic';
	import { mergeWithDefaults, mixColors, sendTipOnce } from '$lib/utils';
	import ToolTipItem from '$lib/components/general/ToolTipItem.svelte';
	import { defaultSettings } from '$lib/allTrees';
	import { SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';

	const {
		pathName,
		fullTree,
		note = '',
		customSettings = {},
		breakdownName = 'breakdown',
		disable_expand_all,
		leftSidePanelInitOpen
	}: TreeDefinition & { fullTree: any } = $props();

	const tipPopUp: Writable<string | false> = getContext('tipPopUpStore');
	const isMobile: Writable<boolean> = getContext('isMobileStore');

	let defaultTree: NodeType | undefined = $state(undefined);

	const settings = mergeWithDefaults(defaultSettings, customSettings);

	let positionedNodes: PosNode[] = $state([]);
	let totalWidth = $state(0);
	let totalHeight = $state(0);

	let titlePositionedNodes: TitlePosNode[] = $state([]);
	let ogTitleWidth = 0;
	let totalTitleWidth = $state(0);
	let totalTitleHeight = $state(0);
	let titlePosLinksShown: TitlePosNode | undefined = $state();
	let titleHighlighted: string | undefined = $state();
	let hidePosLinksTimeout: undefined | number = $state(undefined);
	let disableArrowNav = false;

	let openModal = $state(() => {});
	let containerDiv: HTMLDivElement | undefined = $state();
	let navToPos:
		| ((
				left: number,
				top: number,
				dur?: number,
				useXMid?: boolean,
				useYMid?: boolean,
				zoom?: number
		  ) => void)
		| undefined = $state(undefined);
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

	const selectedBreakdowns = $state(
		createLocalStore(`selectedBreakdowns-${pathName}`, {} as HashMap)
	);
	const COLLAPSED_KEY = `collapsedNodes-${pathName}`;
	const allCollapsed = getAllCollapsed(fullTree);
	let collapsedNodes = $state(allCollapsed);
	let localStr = browser ? localStorage.getItem(COLLAPSED_KEY) : null;
	if (localStr && localStr !== 'undefined') {
		collapsedNodes = new SvelteSet(JSON.parse(localStr));
		let reset = false;
		for (const collapsedNodeID of allCollapsed) {
			if (!allCollapsed.has(collapsedNodeID)) {
				reset = true;
				break;
			}
		}
		if (reset) {
			collapsedNodes = allCollapsed;
			console.log('Reset collapsed nodes');
		}
	}

	const nodeAction = writable(null as null | string);

	onMount(loadTree);

	$effect(() => {
		const subNode = lastNavedNode.posNode?.node.breakdown?.sub_nodes.find(
			(sub) => lastNavedNode.sub === sub.id
		);
		if (subNode && !isNodeEmpty(subNode)) subHighlighted = lastNavedNode.sub || '';
		else subHighlighted = '';
	});

	function updateDefaultPosNodes(centeredNodeID?: string, forceGoFull = false) {
		if (!defaultTree) return;
		let prevCenteredPosNode;
		if (centeredNodeID) {
			prevCenteredPosNode = positionedNodes.find((pos) => pos.node.id === centeredNodeID);
			if (!prevCenteredPosNode) return;
		}
		if (browser) localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(collapsedNodes)));
		const positionedResult = positionTree(defaultTree, collapsedNodes, settings.defaultMode);

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

	function updateTitlePosNodes() {
		const positionedResult = positionHorizontalTree(
			chooseBreakdowns(fullTree, $selectedBreakdowns, true),
			settings.titlesMode
		);

		titlePositionedNodes = positionedResult.positionedNodes;
		totalTitleHeight = positionedResult.totalHeight;
		totalTitleWidth = positionedResult.totalWidth + settings.titlesMode.widthAddition;
		ogTitleWidth = totalTitleWidth;

		setTimeout(() => goFullIfOut(), 1);
	}

	function loadTree(
		selectBreakdown: undefined | { nodeID: string; breakdownID: string } = undefined
	) {
		if (selectBreakdown) $selectedBreakdowns[selectBreakdown.nodeID] = selectBreakdown.breakdownID;
		defaultTree = chooseBreakdowns(fullTree, $selectedBreakdowns);
		updateDefaultPosNodes(selectBreakdown?.nodeID);
		if (selectBreakdown)
			lastNavedNode = {
				posNode: positionedNodes.find((posNode) => posNode.node.id === selectBreakdown.nodeID),
				breakdownSection: true
			};
		updateTitlePosNodes();
	}

	async function handleNavNode({
		id,
		sub,
		duration = 400,
		collapseSub = false,
		leftPanel = false,
		breakdownSection = false,
		centerID = undefined
	}: {
		id: string | undefined;
		sub?: string;
		duration?: number;
		collapseSub?: boolean;
		leftPanel?: boolean;
		centerID?: string;
		breakdownSection?: boolean;
	}) {
		if ($titlesMode || disableArrowNav) return;
		let posNode = positionedNodes.find((pn) => pn.node.id === id);
		if (!posNode) {
			const allParents = getAllParentIDs(id);
			for (const parentID of allParents) collapsedNodes.delete(parentID);
			updateDefaultPosNodes(centerID);
			await tick();
			posNode = positionedNodes.find((pn) => pn.node.id === id);
		}
		lastNavedNode = {
			posNode,
			sub,
			leftPanel,
			breakdownSection
		};
		if (posNode) {
			if (sub) {
				const subPosNode = posNode.miniSubMiddles?.find((mini) => mini.id === sub);
				if (subPosNode) {
					navToPos?.(
						settings.defaultMode.padding + subPosNode.x,
						settings.defaultMode.padding + subPosNode.y - (posNode.miniDivHeight || 0) - 100,
						duration
					);
				}
			} else if (leftPanel) {
				const leftPanelWidth = Math.min(550, window.innerWidth - 40);
				const descriptionWidth = Math.min(700, window.innerWidth - 40);
				const descriptionLeft =
					settings.defaultMode.padding +
					(posNode.left || 0) +
					settings.defaultMode.nodeWidth / 2 -
					descriptionWidth / 2;
				nodeAction.set(`open-left-panel-${posNode?.node.id}`);
				navToPos?.(
					descriptionLeft - 55 - leftPanelWidth / 2,
					settings.defaultMode.padding + (posNode.top || 0) - 80,
					duration
				);
			} else if (breakdownSection) {
				navToPos?.(
					settings.defaultMode.padding + (posNode.left || 0) + settings.defaultMode.nodeWidth / 2,
					settings.defaultMode.padding +
						(posNode.top || 0) -
						80 +
						(posNode.descriptionDivHeight || 0) +
						32,
					duration
				);
			} else {
				navToPos?.(
					settings.defaultMode.padding + (posNode.left || 0) + settings.defaultMode.nodeWidth / 2,
					settings.defaultMode.padding + (posNode.top || 0) - 80,
					duration
				);
			}
		}
		if (collapseSub && sub) {
			disableArrowNav = true;
			setTimeout(() => {
				disableArrowNav = false;
				collapsedNodes.add(sub);
				updateDefaultPosNodes(id);
			}, duration);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if ($titlesMode) return;
		if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
			clearTimeout(useArrowsTipTimeout);
			e.preventDefault();
			if (!lastNavedNode.posNode) {
				handleNavNode({ id: fullTree?.id });
				return;
			}
			const node = lastNavedNode.posNode.node;
			const allParentIDs = getAllParentIDs(node.id);
			let isHidden = false;
			for (const parentID of allParentIDs) {
				if (collapsedNodes.has(parentID)) {
					isHidden = true;
				} else if (isHidden) {
					handleNavNode({ id: parentID });
					return;
				}
			}

			try {
				const lastParent = lastNavedNode.posNode.parent;
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
							handleNavNode({ id: node.id });
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
						if (subNode && !isNodeEmpty(subNode))
							handleNavNode({ id: lastNavedNode.sub, centerID: lastNavedNode.posNode.node.id });
					} else if (
						!lastNavedNode.breakdownSection &&
						(node.breakdown?.explanation || node.breakdown?.paper)
					) {
						handleNavNode({ id: node.id, breakdownSection: true });
					} else if (node.breakdown?.sub_nodes.length) {
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

	function activateSubTree(titlePosNode: TitlePosNode) {
		if (settings.titlesMode.depthLimit !== titlePosNode.depth) return;
		const subTreeSubNode = titlePositionedNodes.findLast(
			(tp) => tp.depth > settings.titlesMode.depthLimit!
		);
		if (subTreeSubNode) {
			const subTreeRootID = getAllParentIDs(subTreeSubNode.node.id).reverse()[titlePosNode.depth];
			if (subTreeRootID === titlePosNode.node.id) return;
			const prevSubTreeRoot = $state(
				titlePositionedNodes.find((pn) => pn.node.id === subTreeRootID)
			);
			if (!prevSubTreeRoot?.children) return;
			prevSubTreeRoot.children = undefined;
			titlePositionedNodes = titlePositionedNodes.filter((tp) => tp.depth <= titlePosNode.depth);
		}
		const sets: HorizontalTreeSettings = {
			...settings.titlesMode,
			avgTextCharSizes: settings.titlesMode.avgTextCharSizes.slice(titlePosNode.depth),
			horizontalSpacingAdditions: settings.titlesMode.horizontalSpacingAdditions.slice(
				titlePosNode.depth
			),
			nodeGroupSpacingAdditions: settings.titlesMode.nodeGroupSpacingAdditions?.slice(
				titlePosNode.depth
			),
			depthLimit: undefined,
			rootNodeColor: titlePosNode.color
		};
		const positionedResult = positionHorizontalTree(
			chooseBreakdowns(
				getFullNodeFromID(titlePosNode.node.id, fullTree),
				$selectedBreakdowns,
				true
			),
			sets
		);

		totalTitleWidth = ogTitleWidth + positionedResult.totalWidth;

		const mainTop = titlePosNode.top || 0;
		const subRootTop = positionedResult.positionedNodes[0].top || 0;
		const topOffset = Math.max(
			0,
			Math.min(totalTitleHeight - positionedResult.totalHeight, mainTop - subRootTop)
		);
		for (const subTitlePosNode of positionedResult.positionedNodes) {
			subTitlePosNode.top = topOffset + (subTitlePosNode.top || 0);
			subTitlePosNode.left = (titlePosNode.left || 0) + (subTitlePosNode.left || 0);
			subTitlePosNode.depth += titlePosNode.depth;
		}
		titlePositionedNodes.push(...positionedResult.positionedNodes.slice(1));
		titlePosNode.children = positionedResult.positionedNodes[0].children;
	}

	function getTitlePosNodeFontSize(depth: number) {
		return (settings.titlesMode.avgTextCharSizes[depth] || settings.titlesMode.defaultTitleCharSize)
			.textSize;
	}

	function getTitlesToolTipFontSize(depth: number) {
		return Math.min(22, Math.max(13, getTitlePosNodeFontSize(depth) * 0.7));
	}

	function getRelatedToolTip(fontSize: number, node?: NodeType, reason?: string) {
		const desc = node?.mini_description || node?.description;
		if (!reason) return desc;
		return `<i style="padding-bottom: ${fontSize / 1.5}px; font-size: ${fontSize - 1.5}px;" class="block text-neutral-400">${reason}</i>${desc}`;
	}

	async function onTitleClick(posNode: TitlePosNode) {
		toggleTitlesMode();
		await tick();
		handleNavNode({ id: posNode.node.id, duration: 0 });
		sendTipOnce('Press t to go back', tipPopUp, 500);
	}
</script>

<svelte:window onkeydown={handleKeyDown} onmousemove={() => (subHighlighted = '')} />

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
								func: () => {
									if (positionedNodes.length) {
										collapsedNodes = getAllCollapsed(fullTree);
										updateDefaultPosNodes(undefined, true);
									}
								}
							},
							...(disable_expand_all
								? []
								: [
										{
											title: 'Expand All',
											shiftKey: true,
											putAfter: true,
											key: 'c',
											func: () => {
												if (positionedNodes.length) {
													collapsedNodes.clear();
													updateDefaultPosNodes(undefined, true);
												}
											}
										}
									])
						])
			]}
			bind:moveByOffset
			bind:navToPos
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
				<div style="padding: {settings.titlesMode.padding}px">
					<div style="height: {totalTitleHeight}px; width: {totalTitleWidth}px;" class="relative">
						{#if titlePosLinksShown && titlePosLinksShown.posLinks}
							{@const toolTipFontSize = getTitlesToolTipFontSize(titlePosLinksShown.depth)}
							<div
								class="absolute"
								style="top: {(titlePosLinksShown.top || 0) -
									getTitlePosNodeFontSize(titlePosLinksShown.depth) -
									10}px; left: {titlePosLinksShown.left}px;"
							>
								<div
									onmouseenter={() => clearTimeout(hidePosLinksTimeout)}
									onmouseleave={() => {
										hidePosLinksTimeout = setTimeout(() => (titlePosLinksShown = undefined), 1);
									}}
									role="presentation"
									transition:fade={{ duration: 100 }}
									class="absolute right-0 top-0 z-[1] pr-3"
								>
									<div
										style="width: {toolTipFontSize * 15}px;"
										class="relative rounded-md border border-[#3a3a3a] bg-[#171717] px-[12px] py-2 text-[#c6c6c6] shadow-lg shadow-black/40"
									>
										<p
											style="font-size: {toolTipFontSize + 3}px"
											class="mb-2 border-b border-[#3a3a3a] pb-2 font-medium text-[#bababa]"
										>
											Related Nodes
										</p>
										<div style="gap: {toolTipFontSize / 2.3}px;" class="grid">
											{#each titlePosLinksShown.posLinks as posLink, i}
												<ToolTipItem
													className="w-fit"
													tooltip={getRelatedToolTip(
														Math.max(toolTipFontSize - 2, 12.5),
														posLink.posNode?.node || posLink.hiddenNode,
														posLink.reason
													)}
													style="font-size: {Math.max(toolTipFontSize - 2, 12.5)}px"
													showOnHover={false}
													containerClassName="cursor-auto"
													tooltipClassName={toolTipFontSize < 16
														? 'max-w-[300px]'
														: 'max-w-[400px]'}
												>
													<button
														onclick={() => {
															if (!posLink.posNode) return;
															navToPos?.(
																(posLink.posNode.left || 0) +
																	settings.titlesMode.padding +
																	posLink.posNode.width / 2,
																(posLink.posNode.top || 0) +
																	settings.titlesMode.padding -
																	getTitlePosNodeFontSize(posLink.posNode.depth) / 2,
																400,
																true,
																true,
																Math.min(
																	Math.max(
																		19,
																		settings.titlesMode.avgTextCharSizes[1].textSize -
																			getTitlePosNodeFontSize(posLink.posNode.depth)
																	) / 50,
																	1
																)
															);
															titlePosLinksShown = undefined;
															titleHighlighted = posLink.posNode.node.id;
															setTimeout(() => {
																titleHighlighted = undefined;
															}, 1100);
														}}
														style="
															font-size: {Math.max(toolTipFontSize - 0.5, 12.5)}px; 
															--base-color: {`hsl(${170 + ((i * 37) % 360)}, 30%, 70%)`};
															color: color-mix(in srgb, var(--base-color) 70%, transparent);
														"
														class="w-fit text-start transition-colors hover:!text-[var(--base-color)]"
													>
														{posLink.posNode?.node.title || posLink.hiddenNode?.title}
													</button>
												</ToolTipItem>
											{/each}
										</div>
									</div>
								</div>
							</div>
						{/if}
						{#each titlePositionedNodes as titlePosNode (titlePosNode.node.id)}
							{@const toolTipFontSize = getTitlesToolTipFontSize(titlePosNode.depth)}
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
										tooltip={titlePosNode.node.mini_description || titlePosNode.node.description}
										tooltipClassName="pt-2"
										toolTipContainerClassName="line-clamp-[12] text-[#cbcbcb]"
										showOnHover={false}
										onShow={() => {
											if (titlePosNode.posLinks) {
												clearTimeout(hidePosLinksTimeout);
												titlePosLinksShown = titlePosNode;
											}
											activateSubTree(titlePosNode);
										}}
										onHide={() => {
											if (titlePosNode.posLinks) {
												hidePosLinksTimeout = setTimeout(
													() => (titlePosLinksShown = undefined),
													20
												);
											}
										}}
										delay={170}
										style="font-size: {toolTipFontSize}px;
										max-width: clamp({toolTipFontSize < 18 ? 300 : 500}px, 83%, {toolTipFontSize < 18 ? 500 : 900}px);"
									>
										<button
											onclick={() => onTitleClick(titlePosNode)}
											style="width: {titlePosNode.children
												? titlePosNode.width
												: ''}px; font-size: {getTitlePosNodeFontSize(titlePosNode.depth)}px;
										border-color: {titlePosNode.color};
										color: {mixColors(titlePosNode.color, 0.3)};
										--hover-color: {titlePosNode.color || '#badaff'}"
											class="whitespace-nowrap border-b-[1px] text-start no-underline transition-colors duration-150 {titleHighlighted ===
											titlePosNode.node.id
												? '![color:var(--hover-color)]'
												: 'hover:![color:var(--hover-color)]'}"
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
				<div style="padding: {settings.defaultMode.padding}px">
					<div
						bind:this={containerDiv}
						style="height: {totalHeight}px; width: {totalWidth}px"
						class="relative"
					>
						{#each positionedNodes as posNode (posNode.node.id)}
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
									note={!posNode.parent && note}
									setMiniMiddles={(m) => (posNode.miniSubMiddles = m)}
									setMiniDivHeight={(h) => (posNode.miniDivHeight = h)}
									onDescriptionClick={() => handleNavNode({ id: posNode.node.id })}
									onMiniClick={(miniNode) => {
										if (collapsedNodes.has(miniNode.id)) {
											if (!isNodeEmpty(miniNode)) handleNavNode({ id: miniNode.id });
										} else {
											collapsedNodes.add(miniNode.id);
											updateDefaultPosNodes(posNode.node.id);
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
							{#each posNode.children || [] as posSubNode (posSubNode.node.id)}
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
