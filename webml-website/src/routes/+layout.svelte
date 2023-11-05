<script lang="ts">
	import '../app.postcss';

	// Floating UI for Popups
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { AppBar, storePopup } from '@skeletonlabs/skeleton';
	import { AppShell } from '@skeletonlabs/skeleton';

	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
</script>

<head>
	<title>WebML - Machine Learning in the browser</title>
</head>

<AppShell>
	<svelte:fragment slot="header"
		><AppBar><h2 class="h2">WebML - Machine Learning in the browser</h2></AppBar></svelte:fragment
	>
	<slot />
</AppShell>
