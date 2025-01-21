import FLIMapTree from '$lib/trees/fli_map.json';
import AITegmarkTree from '$lib/trees/tegmark_ai.json';
import type { TreeDefinition, TreeSettings } from '$lib/types';

// (textSize / charW) = 2.05 - oops, TO DO: Only set the textSize and do calculation elseware
export const defaultSettings: TreeSettings = {
	defaultMode: {
		nodeWidth: 2000,
		nodeHeight: 1400,
		verticalSpacing: 130,
		siblingNodeSpacing: 500,
		nodeGroupSpacing: 600
	},
	titlesMode: {
		widthAddition: 80,
		horizontalSpacing: 600,
		siblingNodeSpacing: 40,
		nodeGroupSpacing: 70,
		avgTextCharSizes: [
			{
				textSize: 70,
				charW: 34
			},
			{
				textSize: 50,
				charW: 24.5
			},
			{
				textSize: 30,
				charW: 14.7
			},
			{
				textSize: 22,
				charW: 10.7
			},
			{
				textSize: 18,
				charW: 8.8
			}
		],
		defaultTitleCharSize: {
			textSize: 15,
			charW: 7.287
		},
		horizontalSpacingAdditions: [350, 70, 70]
	}
};

export const allTrees: TreeDefinition[] = [
	{
		pathName: 'fli-map',
		title: "Future of Life's Map",
		note: 'The data on this map was directly copied from the Future of Life Institute\'s <a class="pretty-link" href="https://futureoflife.org/valuealignmentmap/" target="_blank">Value Alignment Map</a>',
		tree: FLIMapTree,
		customSettings: {
			defaultMode: {
				nodeWidth: 3200
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
		breakdownName: 'paper',
		customSettings: {
			defaultMode: {
				nodeHeight: 2100
			},
			titlesMode: {
				widthAddition: 500,
				horizontalSpacing: 900,
				horizontalSpacingAdditions: [0, 300],
				nodeGroupSpacing: 120
			}
		}
	}
];
