import type { PageLoad } from './$types';
import { allTrees } from '$lib/allTrees';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
	const treeDetails = allTrees.find((t) => t.pathName === params.tree);
	if (!treeDetails) {
		throw error(404, {
			message: 'Tree not found'
		});
	}

	let tree = treeDetails.tree;
	if (!tree) {
		const response = await fetch(`/trees/${treeDetails.pathName}.json`);
		tree = await response.json();
	}

	return {
		...treeDetails,
		tree
	};
};
