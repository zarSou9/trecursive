import { getNodeFromID, getNodeIdIdxs } from './treeLogic';
import type { HorizontalTreeSettings, Node, TitlePosLink, TitlePosNode } from './types';
import { mixColors } from './utils';

function reorderTree(tree: Node) {
	if (tree.breakdown) {
		tree.breakdown.sub_nodes.sort((a, b) => (a.breakdown ? (b.breakdown ? 0 : 1) : -1));
		for (let subNode of tree.breakdown.sub_nodes) reorderTree(subNode);
	}
	return tree;
}

function limitTreeDepth(node: Node, limit: undefined | number, depth = 0) {
	if (!limit) return node;
	if (depth >= limit) {
		delete node.breakdown;
	} else if (node.breakdown) {
		for (let subNode of node.breakdown.sub_nodes) limitTreeDepth(subNode, limit, depth + 1);
	}
	return node;
}

function getTitlePosNode(nodeID: string | undefined, root: TitlePosNode | undefined) {
	if (!root || !nodeID) return;
	let currentNode: TitlePosNode = root;
	const nodeIdxs = getNodeIdIdxs(nodeID);
	for (const idx of nodeIdxs) {
		if (!currentNode?.children) return;
		currentNode = currentNode.children[idx];
	}
	return currentNode;
}

function positionHorizontalTree(tree: Node, settings: HorizontalTreeSettings) {
	const {
		horizontalSpacing,
		siblingNodeSpacing,
		nodeGroupSpacing,
		defaultTitleCharSize,
		avgTextCharSizes,
		horizontalSpacingAdditions,
		baseColors,
		depthLimit
	} = settings;
	const textSizeSpacingFactor = 1.4;

	let currentY = 0;
	let totalHeight = 0;
	let totalWidth = 0;
	let positionedNodes: TitlePosNode[] = [];
	tree = reorderTree(limitTreeDepth(JSON.parse(JSON.stringify(tree)), depthLimit));

	const treePosNode = positionEndNodes(tree);
	setNonEndTops(treePosNode);
	condenseSiblings(treePosNode);
	rereorderPosTree(treePosNode);
	for (let posNode of positionedNodes) {
		totalHeight = Math.max(posNode.top || 0, totalHeight);
		totalWidth = Math.max(posNode.left || 0, totalWidth);

		if (posNode.node.links?.length) {
			posNode.posLinks = [];
			for (const link of posNode.node.links) {
				const posLink: TitlePosLink = {
					id: link.id,
					reason: link.reason
				};
				const thisPosNode = getTitlePosNode(link.id, treePosNode);
				if (thisPosNode) posLink.posNode = thisPosNode;
				else posLink.hiddenNode = getNodeFromID(link.id, tree);

				posNode.posLinks.push(posLink);
			}
		}
	}

	return {
		positionedNodes,
		totalHeight,
		totalWidth
	};

	function rereorderPosTree(rootPosNode: TitlePosNode) {
		if (!rootPosNode.children?.length) return;

		rootPosNode.children.sort((a, b) => {
			const aIdxs = getNodeIdIdxs(a.node.id);
			const bIdxs = getNodeIdIdxs(b.node.id);
			return aIdxs[aIdxs.length - 1] - bIdxs[bIdxs.length - 1];
		});

		for (const child of rootPosNode.children) {
			rereorderPosTree(child);
		}
	}

	function getNodeColor(i: number, parentColor?: string): string {
		const base = baseColors[i % baseColors.length];

		if (!parentColor) return base;

		return mixColors(parentColor, 0.7, base);
	}

	function getHorizontalSpacingAddition(depth: number) {
		if (!depth) return 0;
		let acc = 0;
		for (let i = 0; i < depth; i++) {
			acc += horizontalSpacingAdditions[i] || 0;
		}
		return acc;
	}

	function positionEndNodes(
		node: Node,
		depth = 0,
		parentSubNodes?: Node[],
		firstFound = { v: false },
		color: string | undefined = undefined
	) {
		const posNode: TitlePosNode = {
			depth: depth,
			width: (avgTextCharSizes[depth] || defaultTitleCharSize).charW * node.title.length + 10,
			left: depth * horizontalSpacing + getHorizontalSpacingAddition(depth),
			node,
			color
		};
		positionedNodes.push(posNode);
		if (node.breakdown) {
			posNode.children = [];
			for (let i = 0; i < node.breakdown.sub_nodes.length; i++) {
				const subNode = node.breakdown.sub_nodes[i];
				posNode.children.push(
					positionEndNodes(
						subNode,
						depth + 1,
						node.breakdown.sub_nodes,
						firstFound,
						getNodeColor(i, color)
					)
				);
			}
		} else {
			const first = !parentSubNodes || parentSubNodes[0].id === node.id;
			if (firstFound.v) {
				if (first) currentY += nodeGroupSpacing;
				else
					currentY +=
						siblingNodeSpacing +
						((avgTextCharSizes[depth] || defaultTitleCharSize).textSize -
							defaultTitleCharSize.textSize) *
							textSizeSpacingFactor;
			} else {
				firstFound.v = true;
			}
			posNode.top = currentY;
		}
		return posNode;
	}

	function setNonEndTops(posNode: TitlePosNode | undefined) {
		if (posNode?.top !== undefined || !posNode?.children?.length) return;
		for (let subNode of posNode.children) setNonEndTops(subNode);
		const minSubTop = posNode.children[0].top || 0;
		const maxSubTop = posNode.children[posNode.children.length - 1].top || 0;
		posNode.top = minSubTop + (maxSubTop - minSubTop) / 2;
	}

	function condenseSiblings(posNode: TitlePosNode | undefined) {
		if (!posNode?.children) return;
		let prevChildTopWithChildren = -1;
		let firstChildWithChildrenTopDiff = undefined;
		let firstChildWithChildrenGoesUp = false;
		for (let i = 0; i < posNode.children.length; i++) {
			const subPosNode = posNode.children[i];
			if (subPosNode.children) {
				if ((subPosNode.top || 0) > (posNode.top || 0)) {
					for (const sub of posNode.children) condenseSiblings(sub);
					firstChildWithChildrenGoesUp = true;
					if (i)
						firstChildWithChildrenTopDiff =
							(subPosNode.top || 0) - (posNode.children[i - 1].top || 0);
				}
				break;
			}
		}
		if (!firstChildWithChildrenGoesUp) {
			for (let i = 0; i < posNode.children.length; i++) {
				const subPosNode = posNode.children[i];
				condenseSiblings(subPosNode);
				if (subPosNode.children) {
					subPosNode.top = (posNode.top || 0) + ((subPosNode.top || 0) - (posNode.top || 0)) * 0.3;
					if (prevChildTopWithChildren !== -1) {
						subPosNode.top = Math.max(prevChildTopWithChildren + nodeGroupSpacing, subPosNode.top);
					}
					prevChildTopWithChildren = subPosNode.top;
					if (firstChildWithChildrenTopDiff === undefined && i)
						firstChildWithChildrenTopDiff = subPosNode.top - (posNode.children[i - 1].top || 0);
				}
			}
		}

		if (firstChildWithChildrenTopDiff !== undefined) {
			for (let subPosNode of posNode?.children) {
				if (!subPosNode.children && subPosNode.top) {
					subPosNode.top +=
						firstChildWithChildrenTopDiff -
						siblingNodeSpacing +
						(defaultTitleCharSize.textSize -
							(avgTextCharSizes[subPosNode.depth] || defaultTitleCharSize).textSize) *
							textSizeSpacingFactor;
				}
			}
		}
	}
}

export { positionHorizontalTree };
