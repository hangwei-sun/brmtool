<template>
	<web-view :src="url" />
</template>

<script lang="ts" setup>
import { onLoad } from "@dcloudio/uni-app";
import { ref } from "vue";

const url = ref("");

onLoad((query: any) => {
	url.value = decodeURIComponent(query.url || "");

	if (query.title) {
		uni.setNavigationBarTitle({
			title: decodeURIComponent(query.title),
		});
	}
});
</script>
