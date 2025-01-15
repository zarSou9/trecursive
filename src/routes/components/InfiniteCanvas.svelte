<script lang="ts">
	import { getContext, onMount, setContext } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { createLocalStore } from '$lib/createLocalStore';
	import ToolTipItem from '$lib/components/general/ToolTipItem.svelte';
	import type { DropDownItem, SettingComponent } from '$lib/types';
	import Dropdown from '$lib/components/general/Dropdown.svelte';
	import { writable, type Writable } from 'svelte/store';
	import PopUp from '$lib/components/general/PopUp.svelte';
	import CanvasSettings from '$lib/components/tree/CanvasSettings.svelte';

	type NavItem = {
		title: string;
		onClick: () => void;
		active?: boolean;
		toolTip?: string;
	};

	interface Props {
		oninfo: () => void;
		goFullIfOut?: () => void;
		children?: import('svelte').Snippet;
		coordsKey: string | undefined;
		navToNode?: (middle: number, top: number, dur?: number) => void;
		additionalCommands?: DropDownItem[];
		navItems?: NavItem[];
		moveByOffset?: (offsetX: number, offsetY: number) => void;
		onModalsClosed?: () => void;
	}

	let {
		oninfo,
		goFullIfOut = $bindable(),
		children,
		additionalCommands,
		coordsKey,
		navToNode = $bindable(),
		moveByOffset = $bindable(),
		navItems,
		onModalsClosed = () => {}
	}: Props = $props();

	const zoomIntensity = 0.01;

	// Mobile settings
	const doubleTapDelay = 300; // milliseconds between taps
	const doubleTapDistance = 30; // maximum distance between taps in pixels
	const doubleTapZoomScale = 2; // how much to zoom in on double tap
	const friction = 0.95; // How much touch inertia slows down (1 is no friction)

	goFullIfOut = () => {
		if (z < minZoom) goFull();
	};

	const disableShortcuts = { v: false };
	setContext('disableShortcuts', disableShortcuts);

	const usingCanvasTouch: Writable<boolean> = getContext('usingCanvasTouchStore');
	const isMobile: Writable<boolean> = getContext('isMobileStore');

	let definitelyTouching = false;

	let canvas: HTMLDivElement;
	let viewPort: HTMLDivElement;

	let homeX: number;
	let homeY: number;
	let homeZ: number;

	let z: number;
	let x: number;
	let y: number;
	let minZoom = 0;
	let verticalOffset = 20;
	let horizontalOffset = 20;
	let viewPortResizeObserver: ResizeObserver;
	let canvasResizeObserver: ResizeObserver;
	let vertical = false;
	let smoothMoving = $state(false);
	let isZooming = false;
	let currentDir = '';
	let grabX: number;
	let grabY: number;
	let altPressed = false;
	let grabbed = $state(false);
	let dropdownItems: DropDownItem[] = $derived([
		...(additionalCommands || []),
		{ title: 'Full View', key: 'f', func: goFull },
		{ title: 'Go Home', key: 'h', func: goHome },
		{ title: 'Set Home', key: 'h', metaKey: true, func: setHome },
		{ title: 'How To Use', func: oninfo },
		{
			title: 'Settings',
			func: () => (settingsModalOpen = true)
		}
	]);
	let settingsModalOpen = $state(false);
	let settings: SettingComponent[] = $state([]);

	let viewPortOffset = {
		x: 0,
		y: 0
	};

	const userCoords = createLocalStore(`userCoords-${coordsKey}`, [91291312402, 0, 0, 0, 0, 0]);

	const motionX = tweened(0, {
		duration: 400,
		easing: cubicOut
	});
	const motionY = tweened(0, {
		duration: 400,
		easing: cubicOut
	});
	const motionZ = tweened(0, {
		duration: 400,
		easing: cubicOut
	});
	$effect(() => {
		if (
			$motionX !== undefined &&
			$motionY !== undefined &&
			$motionZ !== undefined &&
			smoothMoving
		) {
			canvas.style.transform = `translate(${$motionX}px, ${$motionY}px) scale(${$motionZ})`;
		}
	});

	let movingToPosTimeout: undefined | number = $state(undefined);
	function moveToPos(xf: number, yf: number, zf: number, dur = 400, delay = dur) {
		clearTimeout(movingToPosTimeout);
		motionX.set(x, { duration: 0 });
		motionY.set(y, { duration: 0 });
		motionZ.set(z, { duration: 0 });
		smoothMoving = true;

		x = xf;
		y = yf;
		z = zf;

		movingToPosTimeout = setTimeout(() => {
			smoothMoving = false;
		}, delay);

		motionX.update(() => xf, { duration: dur });
		motionY.update(() => yf, { duration: dur });
		motionZ.update(() => zf, { duration: dur });
	}

	moveByOffset = (offsetX, offsetY) => {
		const newX = x - offsetX * z;
		const newY = y - offsetY * z;
		moveToPos(newX, newY, z, 0);
	};

	navToNode = (middle, top, dur = 300) => {
		const newZ = 1;
		const newX = -1 * middle + viewPort.clientWidth / 2;
		const newY = -1 * top;
		moveToPos(newX, newY, newZ, dur);
	};

	let mouseSettingsOpen = $state(writable(false));
	const isUsingMouse = createLocalStore('isUsingMouse', false);
	setContext('isUsingMouse', isUsingMouse);

	onMount(() => {
		usingCanvasTouch.set(true);
		mouseSettingsOpen = createLocalStore('mouseSettingsOpen', true);

		viewPortResizeObserver = new ResizeObserver(updateOnResize);
		canvasResizeObserver = new ResizeObserver(updateOnResize);
		canvasResizeObserver.observe(canvas);
		viewPortResizeObserver.observe(viewPort);
		window.addEventListener('keydown', shortCuts);
		window.addEventListener('keyup', handleKeyUp);
		window.addEventListener('beforeunload', beforeUnload);

		minZoom =
			(canvas?.clientWidth / canvas?.clientHeight > viewPort?.clientWidth / viewPort?.clientHeight
				? viewPort?.clientWidth / canvas?.clientWidth
				: viewPort?.clientHeight / canvas?.clientHeight) / 1.1;
		horizontalOffset = (viewPort?.clientWidth - canvas?.clientWidth * minZoom) / 2 / minZoom;
		verticalOffset = (viewPort?.clientHeight - canvas?.clientHeight * minZoom) / 2 / minZoom;
		if (
			canvas?.clientWidth / canvas?.clientHeight <
			viewPort?.clientWidth / viewPort?.clientHeight
		) {
			vertical = true;
		}
		if ($userCoords[0] === 91291312402) {
			z = minZoom;
			x = horizontalOffset * z;
			y = verticalOffset * z;
			homeX = x;
			homeY = y;
			homeZ = z;
		} else {
			[x, y, z, homeX, homeY, homeZ] = $userCoords;
		}
		canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;

		return () => {
			usingCanvasTouch.set(false);
			document.body.style.overflow = '';
			if (inertiaAnimationFrame !== null) cancelAnimationFrame(inertiaAnimationFrame);

			if (viewPort) {
				window.removeEventListener('keydown', shortCuts);
				window.removeEventListener('keyup', handleKeyUp);
				window.removeEventListener('beforeunload', beforeUnload);
				window.removeEventListener('beforeunload', beforeUnload);
				canvasResizeObserver.unobserve(canvas);
				viewPortResizeObserver.unobserve(viewPort);
			}
			userCoords.set([x, y, z, homeX, homeY, homeZ]);
			vertical = false;
		};
	});
	function beforeUnload() {
		userCoords.set([x, y, z, homeX, homeY, homeZ]);
	}
	function updateOnResize() {
		viewPortOffset = {
			x: window.innerWidth - viewPort.clientWidth,
			y: window.innerHeight - viewPort.clientHeight
		};

		minZoom =
			(canvas?.clientWidth / canvas?.clientHeight > viewPort?.clientWidth / viewPort?.clientHeight
				? viewPort?.clientWidth / canvas?.clientWidth
				: viewPort?.clientHeight / canvas?.clientHeight) / 1.1;
		horizontalOffset = (viewPort?.clientWidth - canvas?.clientWidth * minZoom) / 2 / minZoom;
		verticalOffset = (viewPort?.clientHeight - canvas?.clientHeight * minZoom) / 2 / minZoom;

		if (canvas?.clientWidth / canvas?.clientHeight < 1.8) {
			vertical = true;
		} else {
			vertical = false;
		}
	}

	function shortCuts(e: KeyboardEvent) {
		if (disableShortcuts.v) return;
		const k = e.key;
		if ((e.ctrlKey || e.metaKey) && k === '=') {
			e.preventDefault();
			zoomIn();
		} else if ((e.ctrlKey || e.metaKey) && k === '-') {
			e.preventDefault();
			zoomOut();
		} else if (k === '=') {
			if (!isZooming) zooming(true);
		} else if (k === '-') {
			if (!isZooming) zooming(false);
		} else if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
			moving(k);
		} else if (e.altKey) altPressed = true;
		else {
			for (let cmd of dropdownItems) {
				if (cmd.key === k && (e.ctrlKey || e.metaKey ? cmd.metaKey : !cmd.metaKey)) {
					cmd.func();
					return;
				}
			}
		}
	}
	function goFull() {
		moveToPos(horizontalOffset * minZoom, verticalOffset * minZoom, minZoom);
	}

	function handleKeyUp(e: KeyboardEvent) {
		const ctrlKeyMap: any = {
			'∑': 'w',
			å: 'a',
			ß: 's',
			'∂': 'd',
			'–': '-',
			'≠': '='
		};
		const k = ctrlKeyMap[e.key] || e.key;

		if (isZooming) {
			if (k === '=' || k === '-' || k === 'Control' || k === 'Meta' || k === 'Shift') {
				isZooming = false;
			}
		}
		if (currentDir) {
			if (currentDir.includes(k)) {
				const newDir = currentDir.replace(k, '');
				currentDir = '';
				if (newDir) {
					moving(newDir);
				}
			}
		}
		if (k === 'Alt' || k === 'Option') altPressed = false;
	}
	function zoomIn() {
		scale(z * (1 + zoomIntensity + 0.15));
	}
	function zoomOut() {
		scale(z * (1 - zoomIntensity - 0.15));
	}
	function setHome() {
		homeX = x;
		homeY = y;
		homeZ = z;
	}
	function goHome() {
		moveToPos(homeX, homeY, homeZ, 400, 900);
	}

	async function moving(dir: string) {
		if (currentDir.includes(dir)) return;
		let speed = 3.5;
		let dx = 0;
		let dy = 0;
		if (currentDir === 'w') {
			if (dir === 'a') {
				currentDir = 'wa';
				dy = (speed / Math.sqrt(2)) * -1;
				dx = (speed / Math.sqrt(2)) * -1;
			} else if (dir === 's') {
				currentDir = '';
				moving(dir);
				return;
			} else if (dir === 'd') {
				currentDir = 'wd';
				dy = (speed / Math.sqrt(2)) * -1;
				dx = speed / Math.sqrt(2);
			}
		} else if (currentDir === 'a') {
			if (dir === 'w') {
				currentDir = 'wa';
				dy = (speed / Math.sqrt(2)) * -1;
				dx = (speed / Math.sqrt(2)) * -1;
			} else if (dir === 's') {
				currentDir = 'as';
				dy = speed / Math.sqrt(2);
				dx = (speed / Math.sqrt(2)) * -1;
			} else if (dir === 'd') {
				currentDir = '';
				moving(dir);
				return;
			}
		} else if (currentDir === 's') {
			if (dir === 'w') {
				currentDir = '';
				moving(dir);
				return;
			} else if (dir === 'a') {
				currentDir = 'as';
				dy = speed / Math.sqrt(2);
				dx = (speed / Math.sqrt(2)) * -1;
			} else if (dir === 'd') {
				currentDir = 'sd';
				dy = speed / Math.sqrt(2);
				dx = speed / Math.sqrt(2);
			}
		} else if (currentDir === 'd') {
			if (dir === 'w') {
				currentDir = 'wd';
				dy = (speed / Math.sqrt(2)) * -1;
				dx = speed / Math.sqrt(2);
			} else if (dir === 'a') {
				currentDir = '';
				moving(dir);
				return;
			} else if (dir === 's') {
				currentDir = 'sd';
				dy = speed / Math.sqrt(2);
				dx = speed / Math.sqrt(2);
			}
		} else if (!currentDir) {
			currentDir = dir;
			if (dir === 'w') dy = -speed;
			else if (dir === 'a') dx = -speed;
			else if (dir === 's') dy = speed;
			else if (dir === 'd') dx = speed;
		} else {
			currentDir = '';
			return;
		}
		let prevDir = currentDir;
		while (currentDir === prevDir) {
			prevDir = currentDir;
			if ((x - dx) / z <= horizontalOffset) {
				if (
					viewPort.clientWidth / z - ((x - dx) / z + canvas.clientWidth) >=
					horizontalOffset + 1
				) {
					x = (viewPort.clientWidth / z - (horizontalOffset + 1) - canvas.clientWidth) * z;
				} else {
					x -= dx;
					if (x / z > horizontalOffset) {
						x = horizontalOffset * z;
					}
				}
			} else {
				x = horizontalOffset * z;
			}
			if ((y - dy) / z <= verticalOffset) {
				if (viewPort.clientHeight / z - ((y - dy) / z + canvas.clientHeight) >= verticalOffset) {
					y = (viewPort.clientHeight / z - verticalOffset - canvas.clientHeight) * z;
				} else {
					y -= dy;
					if (y / z > verticalOffset) {
						y = verticalOffset * z;
					}
				}
			} else {
				y = verticalOffset * z;
			}

			canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
			await new Promise((resolve) => setTimeout(resolve, 1));
		}
	}
	async function zooming(dir: boolean) {
		let zf;
		if (!smoothMoving) {
			isZooming = true;
			while (isZooming) {
				if (dir) {
					zf = z * 1.008;
				} else {
					zf = z * 0.992;
				}
				const scaleMultiplier = zf / z;
				z = Math.min(Math.max(zf, minZoom), 100);
				if (!(z === 100) && !(z === minZoom)) {
					const offsetX = (viewPort.clientWidth / 2 - x) * (1 - scaleMultiplier);
					const offsetY = (viewPort.clientHeight / 2 - y) * (1 - scaleMultiplier);
					if ((x + offsetX) / z <= horizontalOffset) {
						if (
							viewPort.clientWidth / z - ((x + offsetX) / z + canvas.clientWidth) >=
							horizontalOffset + 1
						) {
							x = (viewPort.clientWidth / z - (horizontalOffset + 1) - canvas.clientWidth) * z;
						} else {
							x += offsetX;
							if (x / z > horizontalOffset) {
								x = horizontalOffset * z;
							}
						}
					} else {
						x = horizontalOffset * z;
					}
					if ((y + offsetY) / z <= verticalOffset) {
						if (
							viewPort.clientHeight / z - ((y + offsetY) / z + canvas.clientHeight) >=
							verticalOffset + 1
						) {
							y = (viewPort.clientHeight / z - (verticalOffset + 1) - canvas.clientHeight) * z;
						} else {
							y += offsetY;
							if (y / z > verticalOffset) {
								y = verticalOffset * z;
							}
						}
					} else {
						y = verticalOffset * z;
					}
				} else if (z === minZoom) {
					x = horizontalOffset * z;
					y = verticalOffset * z;
				}
				canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
				await new Promise((resolve) => setTimeout(resolve, 2));
			}
		}
	}
	function handleGrab(e: MouseEvent) {
		if (!definitelyTouching) usingCanvasTouch.set(false);
		if (e.button !== 2 && !altPressed) {
			grabbed = true;
			grabX = e.clientX;
			grabY = e.clientY;
			window.addEventListener('mousemove', grabMove);
		}
	}
	function endGrab() {
		window.removeEventListener('mousemove', grabMove);
		grabbed = false;
	}

	function grabMove(e: MouseEvent) {
		let dx = grabX - e.clientX;
		let dy = grabY - e.clientY;
		grabX = e.clientX;
		grabY = e.clientY;
		if ((x - dx) / z <= horizontalOffset) {
			if (viewPort.clientWidth / z - ((x - dx) / z + canvas.clientWidth) >= horizontalOffset + 1) {
				x = (viewPort.clientWidth / z - (horizontalOffset + 1) - canvas.clientWidth) * z;
			} else {
				x -= dx;
				if (x / z > horizontalOffset) {
					x = horizontalOffset * z;
				}
			}
		} else {
			x = horizontalOffset * z;
		}
		if ((y - dy) / z <= verticalOffset) {
			if (viewPort.clientHeight / z - ((y - dy) / z + canvas.clientHeight) >= verticalOffset) {
				y = (viewPort.clientHeight / z - verticalOffset - canvas.clientHeight) * z;
			} else {
				y -= dy;
				if (y / z > verticalOffset) {
					y = verticalOffset * z;
				}
			}
		} else {
			y = verticalOffset * z;
		}

		canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
	}

	function scale(zf: number, dur = 250, delay = dur) {
		if (!smoothMoving) {
			motionX.set(x, { duration: 0 });
			motionY.set(y, { duration: 0 });
			motionZ.set(z, { duration: 0 });
			smoothMoving = true;

			const scaleMultiplier = zf / z;
			z = Math.min(Math.max(zf, minZoom), 100);

			if (!(z === 100) && !(z === minZoom)) {
				const offsetX = (viewPort.clientWidth / 2 - x) * (1 - scaleMultiplier);
				const offsetY = (viewPort.clientHeight / 2 - y) * (1 - scaleMultiplier);

				if ((x + offsetX) / z <= horizontalOffset) {
					if (
						viewPort.clientWidth / z - ((x + offsetX) / z + canvas.clientWidth) >=
						horizontalOffset + 1
					) {
						x = (viewPort.clientWidth / z - (horizontalOffset + 1) - canvas.clientWidth) * z;
					} else {
						x += offsetX;
						if (x / z > horizontalOffset) {
							x = horizontalOffset * z;
						}
					}
				} else {
					x = horizontalOffset * z;
				}
				if ((y + offsetY) / z <= verticalOffset) {
					if (
						viewPort.clientHeight / z - ((y + offsetY) / z + canvas.clientHeight) >=
						verticalOffset + 1
					) {
						y = (viewPort.clientHeight / z - (verticalOffset + 1) - canvas.clientHeight) * z;
					} else {
						y += offsetY;
						if (y / z > verticalOffset) {
							y = verticalOffset * z;
						}
					}
				} else {
					y = verticalOffset * z;
				}
			} else if (z === minZoom) {
				x = horizontalOffset * z;
				y = verticalOffset * z;
			}

			motionX.update(() => x, { duration: dur });
			motionY.update(() => y, { duration: dur });
			motionZ.update(() => z, { duration: dur });
			setTimeout(() => {
				smoothMoving = false;
			}, delay);
		}
	}
	function handlePanZoom(e: WheelEvent) {
		e.preventDefault();
		if (!smoothMoving) {
			if (e.ctrlKey || $isUsingMouse) {
				const scaleMultiplier = 1 + -(e.deltaY * zoomIntensity * ($isUsingMouse ? 0.06 : 1));
				const targetZoom = z * scaleMultiplier;

				z = Math.min(Math.max(targetZoom, minZoom), 100);
				if (!(z === 100) && !(z === minZoom)) {
					const offsetX = (e.clientX - x - viewPortOffset.x) * (1 - scaleMultiplier);
					const offsetY = (e.clientY - y - viewPortOffset.y) * (1 - scaleMultiplier);

					if ((x + offsetX) / z <= horizontalOffset) {
						if (
							viewPort.clientWidth / z - ((x + offsetX) / z + canvas.clientWidth) >=
							horizontalOffset + 1
						) {
							x = (viewPort.clientWidth / z - (horizontalOffset + 1) - canvas.clientWidth) * z;
						} else {
							x += offsetX;
							if (x / z > horizontalOffset) {
								x = horizontalOffset * z;
							}
						}
					} else {
						x = horizontalOffset * z;
					}
					if ((y + offsetY) / z <= verticalOffset) {
						if (
							viewPort.clientHeight / z - ((y + offsetY) / z + canvas.clientHeight) >=
							verticalOffset + 1
						) {
							y = (viewPort.clientHeight / z - (verticalOffset + 1) - canvas.clientHeight) * z;
						} else {
							y += offsetY;
							if (y / z > verticalOffset) {
								y = verticalOffset * z;
							}
						}
					} else {
						y = verticalOffset * z;
					}
					canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
				} else if (z === minZoom) {
					z = minZoom;
					x = horizontalOffset * z;
					y = verticalOffset * z;
					canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
				}
			} else {
				if ((x - e.deltaX) / z <= horizontalOffset) {
					if (
						viewPort.clientWidth / z - ((x - e.deltaX) / z + canvas.clientWidth) >=
						horizontalOffset + 1
					) {
						x = (viewPort.clientWidth / z - (horizontalOffset + 1) - canvas.clientWidth) * z;
					} else {
						x -= e.deltaX;
						if (x / z > horizontalOffset) {
							x = horizontalOffset * z;
						}
					}
				} else {
					x = horizontalOffset * z;
				}
				if ((y - e.deltaY) / z <= verticalOffset) {
					if (
						viewPort.clientHeight / z - ((y - e.deltaY) / z + canvas.clientHeight) >=
						verticalOffset
					) {
						y = (viewPort.clientHeight / z - verticalOffset - canvas.clientHeight) * z;
					} else {
						y -= e.deltaY;
						if (y / z > verticalOffset) {
							y = verticalOffset * z;
						}
					}
				} else {
					y = verticalOffset * z;
				}

				canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
			}
		}
	}

	// Touch handling
	let touchStartX = 0;
	let touchStartY = 0;
	let lastTouchDistance = 0;
	let isTouching = false;
	let touchVelocityX = 0;
	let touchVelocityY = 0;
	let lastTouchX = 0;
	let lastTouchY = 0;
	let lastTouchTime = 0;
	let inertiaAnimationFrame: number | null = null;
	let lastTapTime = 0;
	let lastTapX = 0;
	let lastTapY = 0;
	let lastMoveTime = 0;
	let velocityDecayTimeout: number | null = null;

	function handleTouchStart(e: TouchEvent) {
		// Prevent default for multi-touch gestures immediately
		if (e.touches.length > 1) e.preventDefault();
		usingCanvasTouch.set(true);
		definitelyTouching = true;

		// Don't prevent default immediately - we'll wait to see if it's a double tap or pan
		isTouching = true;

		// Cancel any ongoing inertia
		if (inertiaAnimationFrame !== null) {
			cancelAnimationFrame(inertiaAnimationFrame);
			inertiaAnimationFrame = null;
		}

		if (e.touches.length === 1) {
			const currentTime = Date.now();
			const tapX = e.touches[0].clientX;
			const tapY = e.touches[0].clientY;
			const timeDiff = currentTime - lastTapTime;
			const distance = Math.hypot(tapX - lastTapX, tapY - lastTapY);

			if (timeDiff < doubleTapDelay && distance < doubleTapDistance) {
				// Double tap detected - now we prevent default
				e.preventDefault();
				handleDoubleTap(tapX, tapY);
				// Reset tap tracking
				lastTapTime = 0;
				return;
			}

			// Store tap info for next time
			lastTapTime = currentTime;
			lastTapX = tapX;
			lastTapY = tapY;

			// Normal touch handling
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
			lastTouchX = touchStartX;
			lastTouchY = touchStartY;
			lastTouchTime = currentTime;
			touchVelocityX = 0;
			touchVelocityY = 0;
		} else if (e.touches.length === 2) {
			// For pinch gestures, we do want to prevent default
			e.preventDefault();
			lastTouchDistance = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);
		}
	}

	function handleDoubleTap(tapX: number, tapY: number) {
		// If we're already at max zoom, zoom out to min
		if (z >= 100 * 0.9) {
			moveToPos(horizontalOffset * minZoom, verticalOffset * minZoom, minZoom);
			return;
		}

		// Calculate target zoom
		const targetZ = Math.min(z * doubleTapZoomScale, 100);

		// Calculate the point to zoom into (relative to canvas)
		const viewPortRect = viewPort.getBoundingClientRect();
		const relativeX = tapX - viewPortRect.left;
		const relativeY = tapY - viewPortRect.top;

		// Calculate new position to keep the tapped point stationary
		const scaleMultiplier = targetZ / z;
		const offsetX = (relativeX - x) * (1 - scaleMultiplier);
		const offsetY = (relativeY - y) * (1 - scaleMultiplier);

		// Use existing moveToPos function with new coordinates
		moveToPos(
			x + offsetX,
			y + offsetY,
			targetZ,
			300 // duration in ms
		);
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isTouching) return;

		if (e.touches.length === 1) {
			const moveX = Math.abs(e.touches[0].clientX - touchStartX);
			const moveY = Math.abs(e.touches[0].clientY - touchStartY);

			if (moveX > 5 || moveY > 5) {
				e.preventDefault();
				e.stopPropagation();

				const currentTime = Date.now();
				const deltaTime = currentTime - lastTouchTime;
				if (deltaTime > 0) {
					// Calculate velocity (pixels per millisecond)
					touchVelocityX = (e.touches[0].clientX - lastTouchX) / deltaTime;
					touchVelocityY = (e.touches[0].clientY - lastTouchY) / deltaTime;
				}

				const dx = touchStartX - e.touches[0].clientX;
				const dy = touchStartY - e.touches[0].clientY;

				touchStartX = e.touches[0].clientX;
				touchStartY = e.touches[0].clientY;
				lastTouchX = touchStartX;
				lastTouchY = touchStartY;
				lastTouchTime = currentTime;
				lastMoveTime = currentTime; // Track the last movement time

				// Clear any existing timeout
				if (velocityDecayTimeout) {
					clearTimeout(velocityDecayTimeout);
				}

				// Set new timeout to decay velocity if no movement
				velocityDecayTimeout = setTimeout(() => {
					touchVelocityX = 0;
					touchVelocityY = 0;
				}, 50); // 50ms threshold for considering movement stopped

				updatePosition(-dx, -dy);
			}
		} else if (e.touches.length === 2) {
			e.preventDefault();
			e.stopPropagation();
			// Handle pinch zoom
			const touchDistance = Math.hypot(
				e.touches[0].clientX - e.touches[1].clientX,
				e.touches[0].clientY - e.touches[1].clientY
			);

			const pinchCenter = {
				x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
				y: (e.touches[0].clientY + e.touches[1].clientY) / 2
			};

			if (lastTouchDistance > 0) {
				const scaleMultiplier = touchDistance / lastTouchDistance;
				const targetZoom = z * scaleMultiplier;

				z = Math.min(Math.max(targetZoom, minZoom), 100);
				if (!(z === 100) && !(z === minZoom)) {
					const offsetX = (pinchCenter.x - x - viewPortOffset.x) * (1 - scaleMultiplier);
					const offsetY = (pinchCenter.y - y - viewPortOffset.y) * (1 - scaleMultiplier);

					x += offsetX;
					y += offsetY;
				}
			}

			lastTouchDistance = touchDistance;
			canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		// Clear the velocity decay timeout
		if (velocityDecayTimeout) {
			clearTimeout(velocityDecayTimeout);
		}

		// Only start inertia if the touch ended recently after movement
		const timeSinceLastMove = Date.now() - lastMoveTime;
		if (
			timeSinceLastMove < 100 &&
			(Math.abs(touchVelocityX) > 0.1 || Math.abs(touchVelocityY) > 0.1)
		) {
			e.preventDefault();
			startInertia();
		}

		isTouching = false;
		lastTouchDistance = 0;
	}

	function startInertia() {
		let lastTime = Date.now();

		function animate() {
			const currentTime = Date.now();
			const deltaTime = currentTime - lastTime;
			lastTime = currentTime;

			// Apply friction
			touchVelocityX *= friction;
			touchVelocityY *= friction;

			// Move based on velocity
			const dx = touchVelocityX * deltaTime;
			const dy = touchVelocityY * deltaTime;

			if (Math.abs(touchVelocityX) > 0.01 || Math.abs(touchVelocityY) > 0.01) {
				updatePosition(dx, dy);
				inertiaAnimationFrame = requestAnimationFrame(animate);
			} else {
				inertiaAnimationFrame = null;
			}
		}

		inertiaAnimationFrame = requestAnimationFrame(animate);
	}

	// Helper function to update position with boundaries
	function updatePosition(dx: number, dy: number) {
		if ((x + dx) / z <= horizontalOffset) {
			if (viewPort.clientWidth / z - ((x + dx) / z + canvas.clientWidth) >= horizontalOffset + 1) {
				x = (viewPort.clientWidth / z - (horizontalOffset + 1) - canvas.clientWidth) * z;
			} else {
				x += dx;
				if (x / z > horizontalOffset) x = horizontalOffset * z;
			}
		} else {
			x = horizontalOffset * z;
		}

		if ((y + dy) / z <= verticalOffset) {
			if (viewPort.clientHeight / z - ((y + dy) / z + canvas.clientHeight) >= verticalOffset) {
				y = (viewPort.clientHeight / z - verticalOffset - canvas.clientHeight) * z;
			} else {
				y += dy;
				if (y / z > verticalOffset) y = verticalOffset * z;
			}
		} else {
			y = verticalOffset * z;
		}

		canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
	}
</script>

{#if settingsModalOpen}
	<CanvasSettings {isUsingMouse} onClose={() => (settingsModalOpen = false)} />
{/if}

{#if $mouseSettingsOpen && !$isMobile}
	<PopUp position="bottom-middle">
		<div
			class="flex flex-col items-center gap-4 rounded-xl border border-[#2a3444] bg-[#121921] p-6 text-gray-200 shadow-lg"
		>
			<p class="text-center text-[15px] font-medium">Which input device are you using?</p>
			<div class="flex gap-4">
				<button
					class="rounded-lg px-5 py-2 transition-colors {!$isUsingMouse
						? 'bg-[#2a3444] text-white'
						: 'bg-[#202a39] text-gray-300 hover:bg-[#2a3444] hover:text-white'}"
					onclick={() => {
						mouseSettingsOpen.set(false);
						isUsingMouse.set(false);
						onModalsClosed();
					}}
				>
					Trackpad
				</button>
				<button
					class="rounded-lg px-5 py-2 transition-colors {$isUsingMouse
						? 'bg-[#2a3444] text-white'
						: 'bg-[#202a39] text-gray-300 hover:bg-[#2a3444] hover:text-white'}"
					onclick={() => {
						mouseSettingsOpen.set(false);
						isUsingMouse.set(true);
						onModalsClosed();
					}}
				>
					Mouse
				</button>
			</div>
		</div>
	</PopUp>
{/if}

<div
	class="relative size-full overflow-clip bg-[#0f0f0f] {grabbed ? 'cursor-grabbing' : ''}"
	onwheel={handlePanZoom}
	onmousedown={handleGrab}
	onmouseup={endGrab}
	onmouseleave={endGrab}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	ontouchcancel={handleTouchEnd}
	bind:this={viewPort}
	role="presentation"
>
	<div class="absolute right-[14px] top-[14px] z-[1] flex items-center gap-[10px]">
		{#each navItems || [] as navItem}
			<ToolTipItem tooltip={navItem.toolTip} side="right">
				<button
					onclick={navItem.onClick}
					class="rounded-md px-3 py-1.5 text-[13.8px] transition-colors {navItem.active
						? 'bg-[#202a39] text-gray-200'
						: 'bg-[#18202a] text-gray-300 hover:bg-[#202a39] hover:text-gray-200'}"
				>
					{navItem.title}
				</button>
			</ToolTipItem>
		{/each}
		<Dropdown {dropdownItems} />
	</div>
	<div class="canvas" bind:this={canvas}>
		{@render children?.()}
	</div>
</div>

<style>
	.canvas {
		position: relative;
		transform-origin: top left;
		width: min-content;
		height: min-content;
	}
	.canvas::selection {
		background: #80808080;
		color: #f5f5f5;
	}
</style>
