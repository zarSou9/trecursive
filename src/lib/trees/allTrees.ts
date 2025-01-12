import FLIMapTree from '$lib/trees/fli_map.json';
import AITegmarkTree from '$lib/trees/tegmark_ai.json';
import type { TreeDefinition } from '$lib/types';

export const allTrees: TreeDefinition[] = [
	{
		pathName: 'fli-map',
		title: "Future of Life's Map",
		note: 'The data on this map was directly copied from the Future of Life Institute\'s <a class="pretty-link" href="https://futureoflife.org/valuealignmentmap/" target="_blank">Value Alignment Map</a>',
		tree: FLIMapTree,
		customSettings: {
			defaultMode: {
				nodeHeight: 1400
			},
			titlesMode: {
				horizontalSpacing: 800
			}
		}
	},
	{
		pathName: 'ai-safety-goals',
		title: 'AI Safety Goals',
		note: 'This map used LLMs to recursively break down AI safety into continuously smaller sub-goals. At each sub-goal, research papers are found to ground the model as it generates the next breakdown.',
		tree: AITegmarkTree,
		customSettings: {
			defaultMode: {
				nodeHeight: 1700
			},
			titlesMode: {
				horizontalSpacing: 900,
				horizontalSpacingAdditions: [0, 300],
				nodeGroupSpacing: 120
			}
		}
	}
];
