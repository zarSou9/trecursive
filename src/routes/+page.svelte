<script>
	import { allTrees } from '$lib/allTrees';
	import ArrowLine from '$lib/icons/ArrowLine.svelte';
	import { removeHTMLTags } from '$lib/utils';
</script>

<svelte:head>
	<title>AI Research Maps</title>
</svelte:head>

<div class="size-full overflow-auto bg-gradient-to-b from-[#151515] to-[#1e1e1e] px-5 py-16">
	<div class="mx-auto max-w-[900px]">
		<h1
			class="mb-4 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 bg-clip-text text-center text-5xl font-bold tracking-tight text-transparent [text-shadow:_0_4px_30px_rgba(168,85,247,0.15)] sm:text-[72px]"
		>
			AI Research Maps
		</h1>
		<p
			class="mb-14 text-center text-lg font-medium leading-relaxed tracking-wide text-purple-200/70"
		>
			Explore research topics through interactive knowledge maps
		</p>

		<div class="grid gap-6">
			{#each allTrees as treeDetails}
				<a
					href={`/${treeDetails.pathName}`}
					class="group relative rounded-xl bg-white/5 p-6 transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/10"
					aria-label={`View research map for ${treeDetails.title}`}
				>
					<article class="pr-10">
						<h2
							class="text-xl font-semibold tracking-[-0.01em] text-white/95 group-hover:text-white"
						>
							{treeDetails.title}
						</h2>
						{#if treeDetails.note}
							<em
								class="mt-1.5 block text-sm font-normal leading-relaxed text-white/60 [&>a]:text-white/60"
							>
								{removeHTMLTags(treeDetails.note)}
							</em>
						{/if}
						<p
							class="mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-white/75 group-hover:text-white/80"
						>
							{treeDetails.cover_root_description}
						</p>
					</article>

					<div
						class="absolute right-6 top-1/2 -translate-y-1/2 rotate-180 fill-white/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:fill-white/70"
						aria-hidden="true"
					>
						<ArrowLine size="24" />
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
