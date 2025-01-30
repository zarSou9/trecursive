<script>
	import { allTrees } from '$lib/allTrees';
	import ArrowLine from '$lib/icons/ArrowLine.svelte';
	import { removeHTMLTags } from '$lib/utils';
</script>

<svelte:head>
	<title>AI Research Maps</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-[#151515] to-[#212121] px-5 py-16">
	<div class="mx-auto max-w-[900px]">
		<h1
			class="mb-14 bg-gradient-to-r from-purple-900 via-purple-700 to-purple-900 bg-clip-text text-center text-5xl font-semibold tracking-tight text-transparent sm:text-[80px]"
		>
			AI Research Maps
		</h1>

		<div class="grid gap-6">
			{#each allTrees as treeDetails}
				<a
					href={`/${treeDetails.pathName}`}
					class="group relative rounded-xl bg-white/5 p-6 transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/10"
				>
					<div class="pr-10">
						<div
							class="text-xl font-semibold tracking-[-0.01em] text-white/95 group-hover:text-white"
						>
							{treeDetails.title}
						</div>
						{#if treeDetails.note}
							<em
								class="mt-1.5 block text-sm font-normal leading-relaxed text-white/60 [&>a]:text-white/60"
							>
								{removeHTMLTags(treeDetails.note)}
							</em>
						{/if}
						<div
							class="mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-white/75 group-hover:text-white/80"
						>
							{treeDetails.cover_root_description}
						</div>
					</div>

					<div
						class="absolute right-6 top-1/2 -translate-y-1/2 rotate-180 fill-white/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:fill-white/70"
					>
						<ArrowLine size="24" />
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
