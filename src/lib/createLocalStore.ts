import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export function createLocalStore<T>(key: string, defaultValue: T) {
	let initialValue: any;
	let localStr = browser ? localStorage.getItem(key) : null;
	if (localStr !== null && localStr !== 'undefined') {
		initialValue = JSON.parse(localStr);
	} else initialValue = defaultValue;

	const store = writable<T>(initialValue);

	store.subscribe((value) => {
		if (browser) {
			localStorage.setItem(key, JSON.stringify(value));
		}
	});

	return store;
}
