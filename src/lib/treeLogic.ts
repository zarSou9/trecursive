import { SvelteSet } from 'svelte/reactivity';
import type { Node, PosNode, HashMap, VerticalTreeSettings, Breakdown } from './types';

function getSubNodes(node: Node, collapsedNodes: SvelteSet<string>) {
	if (!node.breakdown) return [];
	return node.breakdown.sub_nodes.filter((subNode) => !collapsedNodes.has(subNode.id));
}
function positionTree(t: Node, collapsedNodes: SvelteSet<string>, settings: VerticalTreeSettings) {
	let currentX = 0;
	let totalHeight = 0;
	let totalWidth = 0;
	let positionedNodes: PosNode[] = [];

	const { nodeWidth, nodeHeight, verticalSpacing, siblingNodeSpacing, nodeGroupSpacing } = settings;

	collapsedNodes.delete(t.id); // Will cause infinite recursion if not deleted
	positionEndNodes(t);
	while (findPositioned(t)?.left === undefined) {
		positionBulkOfTree(t);
	}
	for (let posNode of positionedNodes) {
		totalHeight = Math.max((posNode.top || 0) + nodeHeight, totalHeight);
		totalWidth = Math.max((posNode.left || 0) + nodeWidth, totalWidth);
	}

	return {
		positionedNodes,
		totalHeight,
		totalWidth
	};

	function isEndNode(node: Node) {
		if (!node.breakdown) return true;
		for (let subNode of node.breakdown.sub_nodes) {
			if (!collapsedNodes.has(subNode.id)) return false;
		}
		return true;
	}

	function positionEndNodes(node: Node, depth = 0, parent?: Node, firstFound = { v: false }) {
		if (collapsedNodes.has(node.id)) return;

		const posNode: PosNode = {
			top: depth * (nodeHeight + verticalSpacing),
			parent,
			node
		};
		positionedNodes.push(posNode);
		if (isEndNode(node)) {
			const parentSubNodes = parent && getSubNodes(parent, collapsedNodes);
			const first = !parentSubNodes || parentSubNodes[0].id === node.id;
			if (firstFound.v) {
				if (first) currentX += nodeWidth + nodeGroupSpacing;
				else currentX += nodeWidth + siblingNodeSpacing;
			} else {
				firstFound.v = true;
			}
			posNode.left = currentX;
		} else if (node.breakdown) {
			const children: PosNode[] = [];
			for (let subNode of node.breakdown.sub_nodes) {
				const subPosNode = positionEndNodes(subNode, depth + 1, node, firstFound);
				if (subPosNode) children.push(subPosNode);
			}
			if (children.length) posNode.children = children;
		}
		return posNode;
	}

	function findPositioned(node: Node) {
		return positionedNodes.find((pg) => pg.node.id === node.id);
	}

	function positionBulkOfTree(node: Node) {
		if (node.breakdown && !isEndNode(node)) {
			let allChildrenPositioned = true;
			const childrenPosses = [];
			for (let subNode of getSubNodes(node, collapsedNodes)) {
				const l = findPositioned(subNode)?.left;
				if (l === undefined) {
					allChildrenPositioned = false;
					break;
				} else {
					childrenPosses.push(l);
				}
			}
			if (allChildrenPositioned) {
				const totalSubWidth = childrenPosses.slice(-1)[0] + nodeWidth - childrenPosses[0];
				const posNode = findPositioned(node);
				if (!posNode) return;
				posNode.left = childrenPosses[0] + (totalSubWidth / 2 - nodeWidth / 2);
			} else {
				for (let subNode of node.breakdown.sub_nodes) {
					positionBulkOfTree(subNode);
				}
			}
		}
	}
}

function chooseBreakdowns(
	fullNode: any,
	selectedBreakdowns: HashMap = {},
	breakdownMustHaveSubNodes = false,
	depth = 0
) {
	if (!depth) fullNode = JSON.parse(JSON.stringify(fullNode));
	if (fullNode.breakdowns?.[0]) {
		const selectedId = selectedBreakdowns[fullNode.id];
		if (selectedId) {
			const potentialBreakdown = fullNode.breakdowns.find((b: any) => b.id === selectedId);
			if (potentialBreakdown.sub_nodes?.length || !breakdownMustHaveSubNodes)
				fullNode.breakdown = potentialBreakdown;
			else fullNode.breakdown = fullNode.breakdowns[0];
		} else fullNode.breakdown = fullNode.breakdowns[0];
		for (let subNode of fullNode.breakdown.sub_nodes) {
			chooseBreakdowns(subNode, selectedBreakdowns, breakdownMustHaveSubNodes, depth + 1);
		}
		// I can't just do all breakdowns because it loads way too slowly otherwise for no aparent reason
		fullNode.otherBreakdowns = fullNode.breakdowns.filter((b: any) => b !== fullNode.breakdown);
		delete fullNode.breakdowns;
	}
	return fullNode as Node;
}

function getAllCollapsed(fullNode: any, ids?: SvelteSet<string>) {
	if (ids) ids.add(fullNode.id);
	else ids = new SvelteSet();
	for (let breakdown of fullNode.breakdowns || []) {
		for (let subNode of breakdown.sub_nodes || []) {
			getAllCollapsed(subNode, ids);
		}
	}
	return ids;
}

function calculateAvgBranchingFactor(node: Node): number {
	let totalNodes = 0;
	let totalBranches = 0;

	function traverse(n: Node) {
		if (n.breakdown?.sub_nodes) {
			totalNodes++;
			totalBranches += n.breakdown.sub_nodes.length;
			for (const subNode of n.breakdown.sub_nodes) {
				traverse(subNode);
			}
		}
	}

	traverse(node);

	return totalNodes ? totalBranches / totalNodes : 0;
}

function isNodeEmpty(node: Node) {
	return (
		(!node.description || !node.mini_description) &&
		!node.breakdown &&
		!node.questions?.length &&
		!node.papers?.length
	);
}

function getNodeIdIdxs(nodeID: string, onlyNodeIds = true) {
	const idxs: number[] = [];
	let inClosure: null | string = null;
	for (const char of nodeID.slice(1)) {
		if (inClosure !== null) {
			if (char === '.') {
				idxs.push(Number(inClosure));
				inClosure = null;
			} else {
				inClosure += char;
			}
		} else {
			if (char === '.') inClosure = '';
			else idxs.push(Number(char));
		}
	}
	return onlyNodeIds ? idxs.filter((_, i) => i % 2 != 0) : idxs;
}

function getParentID(nodeID: string) {
	if (nodeID.length <= 2) return '';
	return (
		'0' +
		getNodeIdIdxs(nodeID, false)
			.slice(0, -2)
			.map((idx) => (`${idx}`.length > 1 ? `.${idx}.` : `${idx}`))
			.join('')
	);
}

function getParentNode(nodeID: string, root: Node | undefined): Node | undefined {
	if (nodeID === root?.id) return undefined;
	return getNodeFromID(getParentID(nodeID), root);
}

function getAllParentIDs(nodeID: string | undefined): string[] {
	if (!nodeID) return [];
	const parents: string[] = [];
	let currentID = nodeID;
	while (currentID.length) {
		parents.push(currentID);
		currentID = getParentID(currentID);
	}
	return parents;
}

function getNodeFromID(nodeID: string | undefined, root: Node | undefined) {
	if (!root || !nodeID) return;
	let currentNode: Node = root;
	for (const idx of getNodeIdIdxs(nodeID)) {
		if (!currentNode?.breakdown) return;
		currentNode = currentNode.breakdown.sub_nodes[idx];
	}
	return currentNode;
}
function getFullNodeFromID(fullNodeID: string | undefined, root: any) {
	if (!root || !fullNodeID) return;
	let current = root;
	const idxs = getNodeIdIdxs(fullNodeID, false);
	for (let i = 0; i < idxs.length; i++) {
		const idx = idxs[i];
		if (i % 2 === 0) {
			if (!current?.breakdowns?.length) return;
			current = current.breakdowns[idx];
		} else {
			if (!current?.sub_nodes?.length) return;
			current = current.sub_nodes[idx];
		}
	}
	return current;
}

export {
	positionTree,
	getFullNodeFromID,
	chooseBreakdowns,
	getParentID,
	getNodeFromID,
	getNodeIdIdxs,
	getAllCollapsed,
	getSubNodes,
	calculateAvgBranchingFactor,
	getParentNode,
	getAllParentIDs,
	isNodeEmpty
};
