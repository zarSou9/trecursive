import type { Node, PosNode, VerticalTreeSettings } from './types';

function getSubNodes(node: Node, collapsedNodes: string[]) {
	if (!node.breakdown) return [];

	return node.breakdown.sub_nodes.filter((subNode) => !collapsedNodes.includes(subNode.id));
}
function positionTree(t: Node, collapsedNodes: string[], settings: VerticalTreeSettings) {
	let currentX = 0;
	let totalHeight = 0;
	let totalWidth = 0;
	let positionedNodes: PosNode[] = [];

	const {
		minNodeWidth,
		nodeWidthBranchingFactorMultiplier,
		nodeHeight,
		verticalSpacing,
		siblingNodeSpacing,
		nodeGroupSpacing
	} = settings;

	const branchingFactor = calculateAvgBranchingFactor(t) + 2;
	const nodeWidth = Math.max(minNodeWidth, branchingFactor * nodeWidthBranchingFactorMultiplier);

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
		totalWidth,
		nodeWidth
	};

	function isEndNode(node: Node) {
		if (!node.breakdown) return true;
		for (let subNode of node.breakdown.sub_nodes) {
			if (!collapsedNodes.includes(subNode.id)) return false;
		}
		return true;
	}

	function positionEndNodes(node: Node, depth = 0, parent?: Node, firstFound = { v: false }) {
		if (collapsedNodes.includes(node.id)) return;

		const posNode: PosNode = {
			top: depth * (nodeHeight + verticalSpacing),
			parent,
			node
		};
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
			for (let subNode of node.breakdown.sub_nodes) {
				positionEndNodes(subNode, depth + 1, node, firstFound);
			}
		}
		positionedNodes.push(posNode);
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

function choosePlans(fullNode: any, depth = 0) {
	if (!depth) fullNode = JSON.parse(JSON.stringify(fullNode));
	if (fullNode.breakdowns?.[0]) {
		fullNode.breakdown = fullNode.breakdowns?.[0];
		for (let subNode of fullNode.breakdown.sub_nodes) {
			choosePlans(subNode, depth + 1);
		}
		delete fullNode.breakdowns;
	}
	return fullNode as Node;
}

function getAllCollapsed(fullNode: any, ids: false | string[] = false) {
	if (ids) ids.push(fullNode.id);
	else ids = [];
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
function getParentNode(nodeID: string, root: Node | undefined): Node | undefined {
	if (!root || !nodeID) return undefined;
	if (!root.breakdown?.sub_nodes) return undefined;

	for (const subNode of root.breakdown.sub_nodes) {
		if (subNode.id === nodeID) return root;
		const parent = getParentNode(nodeID, subNode);
		if (parent) return parent;
	}

	return undefined;
}

function getAllParentIDs(nodeID: string | undefined, root: Node | undefined): string[] {
	if (!nodeID || !root) return [];
	const parents = [nodeID];
	let currentNode = getParentNode(nodeID, root);
	while (currentNode) {
		parents.push(currentNode.id);
		currentNode = getParentNode(currentNode.id, root);
	}
	return parents;
}

export {
	positionTree,
	choosePlans,
	getAllCollapsed,
	getSubNodes,
	calculateAvgBranchingFactor,
	getParentNode,
	getAllParentIDs
};
