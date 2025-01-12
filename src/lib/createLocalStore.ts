import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export function createLocalStore<T>(key: string, defaultValue: T) {
	const initialValue = browser
		? JSON.parse(localStorage.getItem(key) ?? JSON.stringify(defaultValue))
		: defaultValue;

	const store = writable<T>(initialValue);

	store.subscribe((value) => {
		if (browser) {
			localStorage.setItem(key, JSON.stringify(value));
		}
	});

	return store;
}
