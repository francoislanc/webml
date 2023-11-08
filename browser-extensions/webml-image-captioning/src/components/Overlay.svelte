<script lang="ts">
    import { onMount } from "svelte";

    onMount(() => {
        console.log("mounting overlay from content");
    });
</script>

<div class="overlay container mx-auto">
    <p>Overlay</p>
</div>


<style>
    .overlay {
        position: fixed;
        width: 300px;
        height: 300px;
        top: 16px;
        left: 16px;
        background-color: grey;
        border: 1px solid black;
        padding: 16px;
    }
</style>