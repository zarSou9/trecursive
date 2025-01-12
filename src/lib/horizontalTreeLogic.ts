import type { HorizontalTreeSettings, Node, TitlePosNode } from './types';
import { getCombinations, mixColors } from './utils';

function reorderTree(tree: Node) {
	if (tree.breakdown) {
		tree.breakdown.sub_nodes.sort((a, b) => (a.breakdown ? (b.breakdown ? 0 : 1) : -1));
		for (let subNode of tree.breakdown.sub_nodes) reorderTree(subNode);
	}
	return tree;
}

function positionHorizontalTree(tree: Node, settings: HorizontalTreeSettings = {}) {
	const horizontalSpacing = settings.horizontalSpacing || 100;
	const siblingNodeSpacing = settings.siblingNodeSpacing || 40;
	const nodeGroupSpacing = settings.nodeGroupSpacing || 60;
	const defaultTitleCharSize = settings.defaultTitleCharSize || {
		textSize: 15,
		charW: 7.287
	};
	const avgTextCharSizes = settings.avgTextCharSizes || [
		{
			textSize: 25,
			charW: 12.145
		},
		{
			textSize: 23,
			charW: 11.173
		},
		{
			textSize: 20,
			charW: 9.716
		},
		{
			textSize: 17,
			charW: 8.258
		}
	];
	const horizontalSpacingAdditions = settings.horizontalSpacingAdditions || [350, 70, 70];
	const BASE_COLORS = [
		'rgb(102, 153, 204)', // Muted blue
		'rgb(179, 153, 204)', // Muted purple
		'rgb(204, 153, 153)', // Muted red
		'rgb(153, 204, 153)', // Muted green
		'rgb(204, 179, 153)', // Muted gold
		'rgb(153, 204, 204)' // Muted teal
	];
	const textSizeDifferenceFactor = 1.4;

	let currentY = 0;
	let totalHeight = 0;
	let totalWidth = 0;
	let positionedNodes: TitlePosNode[] = [];
	tree = reorderTree(JSON.parse(JSON.stringify(tree)));

	const treePosNode = positionEndNodes(tree);
	setNonEndTops(treePosNode);
	condenseSiblings(treePosNode);
	for (let posNode of positionedNodes) {
		totalHeight = Math.max(posNode.top || 0, totalHeight);
		totalWidth = Math.max(posNode.left || 0, totalWidth);
	}

	return {
		positionedNodes,
		totalHeight,
		totalWidth
	};

	function getMaxLeft(posNode: TitlePosNode, maxLeft = { v: 0 }) {
		if (posNode.children) for (let subPos of posNode.children) getMaxLeft(subPos, maxLeft);
		else maxLeft.v = Math.max(maxLeft.v, posNode.left || 0);
		return maxLeft.v;
	}

	function flipTree(posNode: TitlePosNode, maxLeft: number) {
		posNode.left = maxLeft - (posNode.left || 0);
		for (const subPosNode of posNode.children || []) flipTree(subPosNode, maxLeft);
	}

	function moveTreeByOffset(posNode: TitlePosNode, offsetTop = 0, offsetLeft = 0) {
		posNode.top = (posNode.top || 0) + offsetTop;
		posNode.left = (posNode.left || 0) + offsetLeft;

		for (const subPosNode of posNode.children || [])
			moveTreeByOffset(subPosNode, offsetTop, offsetLeft);
	}

	function getNodeColor(i: number, parentColor?: string): string {
		const base = BASE_COLORS[i % BASE_COLORS.length];

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
							textSizeDifferenceFactor;
			} else {
				firstFound.v = true;
			}
			posNode.top = currentY;
		}
		positionedNodes.push(posNode);
		return posNode;
	}

	function getHalfs() {
		const layerOneEndNodelens = [];
		for (let firstLayerSubNode of tree.breakdown?.sub_nodes || []) {
			layerOneEndNodelens.push({
				node: firstLayerSubNode,
				numEndNodes: getNumEndNodes(firstLayerSubNode)
			});
		}
		const largeHalf = Math.ceil(layerOneEndNodelens.length / 2);
		const combs = getCombinations(layerOneEndNodelens, largeHalf);

		let smallest_diff = -1;
		let halves: Node[][] = [];
		for (const firstHalf of combs) {
			const secondHalf = layerOneEndNodelens.filter((v) => !firstHalf.find((f) => f === v));

			const diff = Math.abs(
				firstHalf.map((v) => v.numEndNodes).reduce((p, c) => c + p) -
					secondHalf.map((v) => v.numEndNodes).reduce((p, c) => c + p)
			);
			let new_diff;
			if (smallest_diff === -1) new_diff = diff;
			else new_diff = Math.min(smallest_diff, diff);
			if (new_diff !== diff) halves = [firstHalf.map((v) => v.node), secondHalf.map((v) => v.node)];
			console.log(diff);
			smallest_diff = new_diff;
		}
		return halves;
	}

	function getNumEndNodes(node: Node) {
		if (!node.breakdown) throw new Error('getNumEndNodes only takes nodes with children');
		let sum = 0;
		for (let subNode of node.breakdown.sub_nodes) {
			if (subNode.breakdown) sum += getNumEndNodes(subNode);
			else sum += 1;
		}
		return sum;
	}

	function setNonEndTops(posNode: TitlePosNode | undefined) {
		if (posNode?.top !== undefined || !posNode?.children) return;
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
							textSizeDifferenceFactor;
				}
			}
		}
	}
}

export { positionHorizontalTree };
