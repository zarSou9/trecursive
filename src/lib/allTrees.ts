import type { TreeDefinition, TreeSettings } from '$lib/types';
import fliMap from '$lib/tree_settings/fli-map.json';
import aiSafetyMap from '$lib/tree_settings/ai-safety-map.json';
import aiSafetyGoals from '$lib/tree_settings/ai-safety-goals.json';

export const defaultSettings: TreeSettings = {
	defaultMode: {
		nodeWidth: 2600,
		nodeHeight: 1400,
		verticalSpacing: 250,
		siblingNodeSpacing: 500,
		nodeGroupSpacing: 600,
		padding: 1000
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
		],
		padding: 400
	}
};

export const allTrees: TreeDefinition[] = [fliMap, aiSafetyMap, aiSafetyGoals];
