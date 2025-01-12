<script>
	import { allTrees } from '$lib/trees/allTrees';
	import ArrowLine from '$lib/icons/ArrowLine.svelte';
	import { removeHTMLTags } from '$lib/utils';
</script>

<div class="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] px-5 py-16">
	<div class="mx-auto max-w-[900px]">
		<h1
			class="mb-12 bg-gradient-to-r from-purple-900 via-purple-700 to-purple-900 bg-clip-text text-center text-5xl font-semibold tracking-tight text-transparent sm:text-7xl"
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
						<div class="text-xl font-semibold text-white/90">
							{treeDetails.title}
						</div>
						{#if treeDetails.note}
							<em class="mt-2 block text-sm text-white/60 [&>a]:text-white/60">
								{removeHTMLTags(treeDetails.note)}
							</em>
						{/if}
						<div class="mt-3 line-clamp-3 text-white/75">
							{treeDetails.tree.description}
						</div>
					</div>

					<div
						class="absolute right-6 top-1/2 -translate-y-1/2 rotate-180 fill-white/50 transition-transform duration-300 group-hover:translate-x-1"
					>
						<ArrowLine size="24" />
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
