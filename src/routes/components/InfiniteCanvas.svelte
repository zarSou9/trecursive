<script lang="ts">
	import { getContext, onMount, setContext } from 'svelte';
	import type { Component, Snippet } from 'svelte';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { createLocalStore } from '$lib/createLocalStore';
	import ToolTipItem from '$lib/components/general/ToolTipItem.svelte';
	import type { DropDownItem } from '$lib/types';
	import Dropdown from '$lib/components/general/Dropdown.svelte';
	import type { Writable } from 'svelte/store';
	import PopUp from '$lib/components/general/PopUp.svelte';
	import CanvasSettings from '$lib/components/tree/CanvasSettings.svelte';
	import { Tween } from 'svelte/motion';

	type NavItem = {
		title: string;
		onClick: () => void;
		active?: boolean;
		toolTip?: string;
	};

	interface Props {
		InfoModal: Component<{
			open: (includeDontShow?: boolean) => void;
			onClose?: (dontShowAgain?: boolean) => void;
		}>;
		goFullIfOut?: (forceGoFull?: boolean) => void;
		children?: Snippet;
		coordsKey: string | undefined;
		navToPos?: (
			left: number,
			top: number,
			dur?: number,
			useXMid?: boolean,
			useYMid?: boolean,
			zoom?: number
		) => void;
		additionalCommands?: DropDownItem[];
		navItems?: NavItem[];
		moveByOffset?: (offsetX: number, offsetY: number) => void;
		onModalsClosed?: () => void;
		includeHomeFunctionality?: boolean;
	}

	let {
		InfoModal,
		goFullIfOut = $bindable(),
		children,
		additionalCommands,
		coordsKey,
		navToPos = $bindable(),
		moveByOffset = $bindable(),
		navItems,
		includeHomeFunctionality = false,
		onModalsClosed = () => {}
	}: Props = $props();

	const zoomIntensity = 0.01;
	const maxZoom = 100;

	// Mobile settings
	const doubleTapDelay = 250; // maximum milliseconds between taps
	const doubleTapDistance = 25; // maximum distance between taps in pixels
	const doubleTapZoomScale = 1.55; // how much to zoom in on double tap
	const friction = 0.95; // How much touch inertia slows down (1 is no friction)

	goFullIfOut = (forceGoFull = false) => {
		if (z < minZoom || forceGoFull) goFull();
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
	let prevGrabX: number;
	let prevGrabY: number;
	let altPressed = false;
	let grabbed = $state(false);
	let rightAfterFirstTime = false;
	let openInfoModal: (includeDontShow?: boolean) => void = $state(() => {});
	let dropdownItems: DropDownItem[] = $derived([
		...(additionalCommands?.filter((v) => !v.putAfter) || []),
		{ title: 'Full View', key: 'f', func: goFull },
		...(includeHomeFunctionality
			? [
					{ title: 'Go Home', key: 'h', func: goHome },
					{ title: 'Set Home', key: 'h', metaKey: true, func: setHome }
				]
			: []),
		...(additionalCommands?.filter((v) => v.putAfter) || []),
		...($isMobile
			? []
			: [
					{ title: 'How To Use', func: openInfoModal },
					{
						title: 'Settings',
						func: () => (settingsModalOpen = true)
					}
				])
	]);
	let settingsModalOpen = $state(false);

	let viewPortOffset = {
		x: 0,
		y: 0
	};

	const userCoords = createLocalStore(`userCoords-${coordsKey}`, [91291312402, 0, 0, 0, 0, 0]);

	const tweenX = new Tween(0);
	const tweenY = new Tween(0);
	const tweenZ = new Tween(0);
	$effect(() => {
		if (smoothMoving) {
			x = tweenX.current;
			y = tweenY.current;
			z = tweenZ.current;
			canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
		}
	});

	let movingToPosTimeout: undefined | number = $state(undefined);
	async function moveToPos(xf: number, yf: number, zf: number, dur = 400, delay = dur) {
		clearTimeout(movingToPosTimeout);
		await Promise.all([
			tweenX.set(x, { duration: 0 }),
			tweenY.set(y, { duration: 0 }),
			tweenZ.set(z, { duration: 0 })
		]);

		tweenX.set(xf, { duration: dur, easing: smoothMoving ? cubicOut : cubicInOut });
		tweenY.set(yf, { duration: dur, easing: smoothMoving ? cubicOut : cubicInOut });
		tweenZ.set(zf, { duration: dur, easing: smoothMoving ? cubicOut : cubicInOut });

		smoothMoving = true;

		movingToPosTimeout = setTimeout(() => {
			smoothMoving = false;
		}, delay);
	}

	moveByOffset = (offsetX, offsetY) => {
		const newX = x - offsetX * z;
		const newY = y - offsetY * z;
		moveToPos(newX, newY, z, 0);
	};
	navToPos = (left, top, dur = 300, useXMid = true, useYMid = false, zoom = 1) => {
		const newZ = zoom;
		const newX = -1 * left * zoom + (useXMid ? viewPort.clientWidth / 2 : 0);
		const newY = -1 * top * zoom + (useYMid ? viewPort.clientHeight / 2 : 0);
		moveToPos(newX, newY, newZ, dur);
	};

	let inputSettingsOpen = $state(false);
	const isFirstTime = createLocalStore('isFirstTime', true);
	const isUsingMouse = createLocalStore('isUsingMouse', false);
	const dontShowInfoModal = createLocalStore('dontShowInfoModal', false);
	setContext('isUsingMouse', isUsingMouse);

	onMount(() => {
		usingCanvasTouch.set(true);
		if (!$dontShowInfoModal) openInfoModal(true);

		viewPortResizeObserver = new ResizeObserver(updateOnResize);
		canvasResizeObserver = new ResizeObserver(updateOnResize);
		canvasResizeObserver.observe(canvas);
		viewPortResizeObserver.observe(viewPort);
		window.addEventListener('keydown', shortCuts);
		window.addEventListener('keyup', handleKeyUp);
		window.addEventListener('beforeunload', beforeUnload);

		updateOnResize();
		if ($userCoords[0] === 91291312402) {
			z = minZoom;
			x = horizontalOffset * z;
			y = verticalOffset * z;
			homeX = x;
			homeY = y;
			homeZ = z;
			rightAfterFirstTime = true;
			setTimeout(() => {
				rightAfterFirstTime = false;
			}, 500);
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
		if (rightAfterFirstTime) {
			// go full
			z = minZoom;
			x = horizontalOffset * z;
			y = verticalOffset * z;
			homeX = x;
			homeY = y;
			homeZ = z;
			canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
		}
	}

	function shortCuts(e: KeyboardEvent) {
		if (disableShortcuts.v) return;
		const k = e.key;
		if ((e.ctrlKey || e.metaKey) && k === '=') {
			e.preventDefault();
			const [newX, newY, newZ] = updateZoomPure(
				1 + zoomIntensity + 0.25,
				viewPort.clientWidth / 2,
				viewPort.clientHeight / 2
			);
			moveToPos(newX, newY, newZ);
		} else if ((e.ctrlKey || e.metaKey) && k === '-') {
			e.preventDefault();
			const [newX, newY, newZ] = updateZoomPure(
				1 - zoomIntensity - 0.25,
				viewPort.clientWidth / 2,
				viewPort.clientHeight / 2
			);
			moveToPos(newX, newY, newZ);
		} else if (k === '=') {
			if (!isZooming) zooming(true);
		} else if (k === '-') {
			if (!isZooming) zooming(false);
		} else if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
			moving(k);
		} else if (e.altKey) altPressed = true;
		else {
			for (let cmd of dropdownItems) {
				if (
					cmd.key === k.toLowerCase() &&
					!!cmd.metaKey === (e.ctrlKey || e.metaKey) &&
					!!cmd.shiftKey === e.shiftKey
				) {
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
	function setHome() {
		homeX = x;
		homeY = y;
		homeZ = z;
	}
	function goHome() {
		moveToPos(homeX, homeY, homeZ, 400, 900);
	}

	function updatePositionPure(offsetX: number, offsetY: number, fromZoom = false) {
		let newX = x;
		let newY = y;

		if (fromZoom && z < minZoom + 0.01) return [x + offsetX, y + offsetY];

		if (viewPort.clientWidth / z - ((x + offsetX) / z + canvas.clientWidth) >= horizontalOffset) {
			newX = (viewPort.clientWidth / z - (horizontalOffset + 1) - canvas.clientWidth) * z;
		} else {
			newX += offsetX;
			if (newX / z > horizontalOffset) newX = horizontalOffset * z;
		}

		if (viewPort.clientHeight / z - ((y + offsetY) / z + canvas.clientHeight) >= verticalOffset) {
			newY = (viewPort.clientHeight / z - (verticalOffset + 1) - canvas.clientHeight) * z;
		} else {
			newY += offsetY;
			if (newY / z > verticalOffset) newY = verticalOffset * z;
		}

		return [newX, newY];
	}

	function updateZoomPure(scaleMultiplier: number, centerX: number, centerY: number) {
		const newZ = Math.min(Math.max(z * scaleMultiplier, minZoom), maxZoom);

		const zDiff = 1 - newZ / z;

		const offsetX = (centerX - x - viewPortOffset.x) * zDiff;
		const offsetY = (centerY - y - viewPortOffset.y) * zDiff;

		return [...updatePositionPure(offsetX, offsetY, true), newZ];
	}

	function updatePosition(offsetX: number, offsetY: number) {
		[x, y] = updatePositionPure(offsetX, offsetY);
	}

	function updateZoom(scaleMultiplier: number, centerX: number, centerY: number) {
		[x, y, z] = updateZoomPure(scaleMultiplier, centerX, centerY);
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
			updatePosition(-dx, -dy);

			canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
			await new Promise((resolve) => setTimeout(resolve, 1));
		}
	}
	async function zooming(dir: boolean) {
		if (!smoothMoving) {
			isZooming = true;
			while (isZooming) {
				updateZoom(dir ? 1.008 : 0.992, viewPort.clientWidth / 2, viewPort.clientHeight / 2);

				canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
				await new Promise((resolve) => setTimeout(resolve, 2));
			}
		}
	}
	function handleGrab(e: MouseEvent) {
		if (!definitelyTouching) usingCanvasTouch.set(false);
		if (e.button !== 2 && !altPressed) {
			grabbed = true;
			prevGrabX = e.clientX;
			prevGrabY = e.clientY;
			window.addEventListener('mousemove', grabMove);
		}
	}
	function endGrab() {
		window.removeEventListener('mousemove', grabMove);
		grabbed = false;
	}

	function grabMove(e: MouseEvent) {
		updatePosition(e.clientX - prevGrabX, e.clientY - prevGrabY);

		prevGrabX = e.clientX;
		prevGrabY = e.clientY;
		canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
	}

	function handlePanZoom(e: WheelEvent) {
		e.preventDefault();
		if (!smoothMoving) {
			if (e.ctrlKey || $isUsingMouse) {
				const scaleMultiplier = 1 + -(e.deltaY * zoomIntensity * ($isUsingMouse ? 0.06 : 1));

				updateZoom(scaleMultiplier, e.clientX, e.clientY);
			} else {
				updatePosition(-e.deltaX, -e.deltaY);
			}
			canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
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
		const scaleMultiplier = Math.min(doubleTapZoomScale, maxZoom / z);

		const [newX, newY, newZ] = updateZoomPure(
			scaleMultiplier,
			tapX - viewPortOffset.x,
			tapY - viewPortOffset.y
		);

		moveToPos(newX, newY, newZ, 300);
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isTouching) return;

		if (e.touches.length === 1) {
			const moveX = Math.abs(e.touches[0].clientX - touchStartX);
			const moveY = Math.abs(e.touches[0].clientY - touchStartY);

			if (moveX > 5 || moveY > 5) {
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
				canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
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
				updateZoom(touchDistance / lastTouchDistance, pinchCenter.x, pinchCenter.y);
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
				canvas.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
				inertiaAnimationFrame = requestAnimationFrame(animate);
			} else {
				inertiaAnimationFrame = null;
			}
		}

		inertiaAnimationFrame = requestAnimationFrame(animate);
	}

	function setupTouchMove(node: HTMLElement) {
		node.addEventListener('touchmove', handleTouchMove, { passive: false });

		return {
			destroy() {
				node.removeEventListener('touchmove', handleTouchMove);
			}
		};
	}
</script>

{#if !$isMobile}
	<InfoModal
		bind:open={openInfoModal}
		onClose={(dontShowAgain) => {
			if ($isFirstTime) inputSettingsOpen = true;
			if (dontShowAgain) dontShowInfoModal.set(true);
		}}
	/>
{/if}

{#if settingsModalOpen && !$isMobile}
	<CanvasSettings {isUsingMouse} onClose={() => (settingsModalOpen = false)} />
{/if}

{#if inputSettingsOpen && !$isMobile}
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
						isFirstTime.set(false);
						isUsingMouse.set(false);
						inputSettingsOpen = false;
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
						isFirstTime.set(false);
						isUsingMouse.set(true);
						inputSettingsOpen = false;
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
	ontouchend={handleTouchEnd}
	ontouchcancel={handleTouchEnd}
	bind:this={viewPort}
	role="presentation"
	use:setupTouchMove
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
