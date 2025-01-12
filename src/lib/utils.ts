import { get, type Writable } from 'svelte/store';
import { createLocalStore } from './createLocalStore';

function mixColors(color1: string | undefined, weight: number, color2?: string): string {
	const c1 = color1?.match(/\d+/g)?.map(Number) || [209, 209, 209];
	const c2 = color2?.match(/\d+/g)?.map(Number) || [255, 255, 255];

	// Mix the colors
	const r = Math.round(c1[0] * weight + c2[0] * (1 - weight));
	const g = Math.round(c1[1] * weight + c2[1] * (1 - weight));
	const b = Math.round(c1[2] * weight + c2[2] * (1 - weight));

	return `rgb(${r}, ${g}, ${b})`;
}

function textToHTML(text: string) {
	return text.replaceAll('\n', '<br/>');
}

function getCombinations<T>(arr: T[], subListLen: number, base: T[] = []) {
	const combs: T[][] = [];
	for (let i = 0; i < arr.length; i++) {
		const subBase = [...base, arr[i]];
		const restArr = arr.slice(i + 1);
		if (subBase.length >= subListLen) {
			combs.push(subBase);
		} else if (restArr.length + subBase.length >= subListLen) {
			combs.push(...getCombinations(restArr, subListLen, subBase));
		}
	}
	return combs;
}

function sendTipOnce(tip: string, tipPopUp: Writable<string | false>, delay = 0) {
	const arrowTipSent = createLocalStore(tip, false);
	if (!get(arrowTipSent)) {
		arrowTipSent.set(true);
		return setTimeout(() => {
			tipPopUp.set(tip);
		}, delay);
	}
}

function getMetaKey() {
	return navigator.userAgent.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : '^';
}

function clickOutside(node: HTMLElement, callback: () => void) {
	const handleClick = (event: MouseEvent) => {
		if (!node.contains(event.target as Node)) {
			callback();
		}
	};

	document.addEventListener('click', handleClick, true);

	return {
		destroy() {
			document.removeEventListener('click', handleClick, true);
		}
	};
}

function mergeWithDefaults<T extends object>(defaultObj: T, customObj: any): T {
	const result = { ...defaultObj };

	for (const [key, defaultValue] of Object.entries(defaultObj)) {
		const customValue = customObj[key as keyof T];

		if (customValue === undefined) continue;

		if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
			result[key as keyof T] = mergeWithDefaults(
				defaultValue as object,
				customValue as object
			) as T[keyof T];
		} else {
			result[key as keyof T] = customValue as T[keyof T];
		}
	}

	return result;
}

function removeHTMLTags(html: string) {
	return html.replace(/<[^>]*>/g, '');
}

export {
	mixColors,
	textToHTML,
	getMetaKey,
	removeHTMLTags,
	getCombinations,
	sendTipOnce,
	clickOutside,
	mergeWithDefaults
};
