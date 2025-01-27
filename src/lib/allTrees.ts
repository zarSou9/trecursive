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
				charW: 26
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
		horizontalSpacingAdditions: [350, 70, 70],
		baseColors: [
			'rgb(102, 153, 204)', // Muted blue
			'rgb(179, 153, 204)', // Muted purple
			'rgb(204, 153, 153)', // Muted red
			'rgb(153, 204, 153)', // Muted green
			'rgb(204, 179, 153)', // Muted gold
			'rgb(153, 204, 204)' // Muted teal
		]
	}
};

export const allTrees: TreeDefinition[] = [
	{
		pathName: 'ai-safety-map',
		title: 'AI Safety Map',
		disable_expand_all: true,
		note: 'This map used LLMs to map the AI safety research landscape. Each node is equipped with a list of related papers.',
		cover_root_description:
			'AI safety is the interdisciplinary field dedicated to ensuring that artificial intelligence systems are designed, developed, and deployed in ways that align with human values, promote societal well-being, and minimize risks. As AI continues to evolve in capability and influence, the field addresses both immediate concerns, such as fairness, robustness, and transparency in current systems, and long-term challenges, including ensuring that more advanced systems\u2014such as artificial general intelligence (AGI)\u2014operate safely and beneficially.',
		leftSidePanelInitOpen: true,
		customSettings: {
			titlesMode: {
				horizontalSpacingAdditions: [0, 400],
				widthAddition: 800,
				horizontalSpacing: 900,
				depthLimit: 3,
				nodeGroupSpacing: 100
			}
		}
	},
	{
		pathName: 'ai-safety-goals',
		title: 'AI Safety Goals',
		note: 'This map used LLMs to recursively break down AI safety into continuously smaller sub-goals. At each sub-goal, research papers are found to ground the model as it generates the next breakdown.',
		cover_root_description:
			'Mitigate the risk that people build an agentic AI system which results in the loss of human control, extinction or some other existential catastrophe.',
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
	},
	{
		pathName: 'fli-map',
		title: "Future of Life's Map",
		note: 'The data on this map was directly copied from the Future of Life Institute\'s <a class="pretty-link" href="https://futureoflife.org/valuealignmentmap/" target="_blank">Value Alignment Map</a>',
		cover_root_description:
			"The project of creating value-aligned AI is perhaps one of the most important things we will ever do. However, there are open and often neglected questions regarding what is exactly entailed by 'beneficial AI.' Value alignment is the project of one day creating beneficial AI and has been expanded outside of its usual technical context to reflect and model its truly interdisciplinary nature.",
		customSettings: {
			defaultMode: {
				nodeWidth: 3200
			},
			titlesMode: {
				horizontalSpacing: 800
			}
		}
	}
];
