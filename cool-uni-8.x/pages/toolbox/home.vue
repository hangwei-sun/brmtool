<template>
	<view class="toolbox-mobile">
		<view class="hero">
			<view>
				<text class="eyebrow">BRMTOOL H5</text>
				<text class="title">数智工具箱</text>
				<text class="desc">移动端先覆盖浏览、搜索、收藏、Web 工具和消息入口。</text>
			</view>
			<view class="hero-actions">
				<button size="mini" @tap="goLogin">
					{{ user.info?.nickName || (isLoggedIn ? "我的" : "登录") }}
				</button>
				<button size="mini" @tap="toggleMessages">
					消息
					<text v-if="unreadCount" class="dot">{{ unreadCount }}</text>
				</button>
			</view>
		</view>

		<view v-if="showMessages" class="message-panel">
			<view class="message-head">
				<text>消息通知</text>
				<button size="mini" :loading="messageLoading" @tap="loadMessages">刷新</button>
			</view>
			<view
				v-for="item in messages"
				:key="item.id"
				class="message-item"
				:class="{ unread: !item.isRead }"
				@tap="readMessage(item)"
			>
				<text>{{ item.title }}</text>
				<text>{{ item.createTime || item.publishTime || "" }}</text>
			</view>
			<view v-if="!messages.length" class="message-empty">暂无消息</view>
		</view>

		<view v-if="offline" class="offline-tip">当前网络不可用，已显示本地页面，部分同步能力会暂停。</view>

		<view class="search">
			<text>⌕</text>
			<input v-model="keyword" placeholder="搜索工具、关键词" confirm-type="search" />
		</view>

		<scroll-view class="categories" scroll-x>
			<view
				v-for="item in categories"
				:key="item.code"
				class="category"
				:class="{ active: activeCategory === item.code }"
				@tap="activeCategory = item.code"
			>
				<text>{{ item.icon || item.name.slice(0, 1) }}</text>
				<text>{{ item.name }}</text>
			</view>
		</scroll-view>

		<view class="section-head">
			<text>推荐工具</text>
			<button size="mini" :loading="loading" @tap="loadHome">刷新</button>
		</view>

		<view v-if="error" class="error">{{ error }}</view>

		<view class="tool-list">
			<view v-for="tool in visibleTools" :key="tool.id" class="tool-card" @tap="openTool(tool)">
				<view class="icon">{{ tool.icon }}</view>
				<view class="body">
					<view class="name-row">
						<text class="name">{{ tool.name }}</text>
						<text v-if="tool.authRequired" class="badge">登录</text>
						<text v-if="tool.type === 'local_plugin'" class="badge muted">仅桌面</text>
						<text
							class="favorite"
							:class="{ active: favoriteIds.has(tool.id) }"
							@tap.stop="toggleFavorite(tool)"
						>
							★
						</text>
					</view>
					<text class="summary">{{ tool.description }}</text>
					<view class="tags">
						<text v-for="tag in tool.tags" :key="tag">{{ tag }}</text>
					</view>
				</view>
			</view>
		</view>

		<view v-if="!visibleTools.length && !loading" class="empty">暂无可展示工具</view>
	</view>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { config, useStore } from "/@/cool";
import request from "/@/cool/service/request";

type ToolType = "external_link" | "internal_web" | "local_plugin";

interface ToolboxCategory {
	id: number;
	name: string;
	code: string;
	icon?: string;
}

interface ToolboxTool {
	id: number;
	categoryId?: number;
	name: string;
	code: string;
	description: string;
	icon?: string;
	type: ToolType;
	entry: string;
	tags?: string[];
	keywords?: string;
	authRequired?: number | boolean;
	isFavorite?: boolean;
	sort?: number;
}

interface ToolboxMessage {
	id: number;
	title: string;
	content?: string;
	isRead?: boolean;
	createTime?: string;
	publishTime?: string;
}

const { user } = useStore();

const keyword = ref("");
const activeCategory = ref("all");
const loading = ref(false);
const error = ref("");
const offline = ref(false);
const categories = ref<ToolboxCategory[]>([{ id: 0, name: "全部", code: "all", icon: "全" }]);
const tools = ref<ToolboxTool[]>([]);
const favoriteIds = ref(new Set<number>());
const unreadCount = ref(0);
const messages = ref<ToolboxMessage[]>([]);
const showMessages = ref(false);
const messageLoading = ref(false);

const isLoggedIn = computed(() => Boolean(user.token));

const categoryMap = computed(() => new Map(categories.value.map((item) => [item.id, item])));

const visibleTools = computed(() => {
	const key = keyword.value.trim().toLowerCase();

	return tools.value
		.filter((tool) => {
			const category = categoryMap.value.get(tool.categoryId || 0);
			const matchCategory = activeCategory.value === "all" || category?.code === activeCategory.value;
			const searchable = [tool.name, tool.description, tool.keywords, ...(tool.tags || [])]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return matchCategory && (!key || searchable.includes(key));
		})
		.sort((a, b) => Number(b.sort || 0) - Number(a.sort || 0) || Number(b.id || 0) - Number(a.id || 0));
});

onMounted(() => {
	bindNetworkStatus();
	loadHome();
	loadUnreadCount();
});

onUnmounted(() => {
	if (typeof window !== "undefined" && networkStatusHandler) {
		window.removeEventListener("online", networkStatusHandler);
		window.removeEventListener("offline", networkStatusHandler);
	}
});

let networkStatusHandler: (() => void) | null = null;

function bindNetworkStatus() {
	if (typeof window === "undefined") {
		return;
	}

	const update = () => {
		offline.value = !window.navigator.onLine;
	};

	networkStatusHandler = update;
	update();
	window.addEventListener("online", update);
	window.addEventListener("offline", update);
}

async function loadHome() {
	loading.value = true;
	error.value = "";

	try {
		const data = (await request({
			url: `${config.baseUrl}/app/toolbox/home`,
			method: "GET",
		})) as any;

		categories.value = [
			{ id: 0, name: "全部", code: "all", icon: "全" },
			...(data.categories || []),
		];

		const map = new Map<string, ToolboxTool>();
		[
			...(data.recommendTools || []),
			...(data.newTools || []),
			...(data.hotTools || []),
			...(data.favoriteTools || []),
			...(data.recentTools || []),
		].forEach((tool: ToolboxTool) => {
			map.set(tool.code || String(tool.id), {
				...tool,
				icon: tool.icon || tool.name.slice(0, 1),
				tags: Array.isArray(tool.tags) ? tool.tags : [],
			});
		});

		tools.value = Array.from(map.values());
		favoriteIds.value = new Set(
			tools.value.filter((item) => item.isFavorite).map((item) => Number(item.id)),
		);
	} catch (err) {
		error.value = (err as Error).message || "工具箱接口暂不可用";
	} finally {
		loading.value = false;
	}
}

async function openTool(tool: ToolboxTool) {
	if (tool.authRequired && !isLoggedIn.value) {
		requireLogin();
		return;
	}

	if (tool.type === "local_plugin") {
		uni.showToast({ title: "该插件仅支持桌面端", icon: "none" });
		return;
	}

	const url = normalizeToolUrl(tool.entry);
	if (!url) {
		uni.showToast({ title: "该工具暂未适配移动端", icon: "none" });
		return;
	}

	uni.navigateTo({
		url: `/pages/toolbox/webview?title=${encodeURIComponent(tool.name)}&url=${encodeURIComponent(url)}`,
	});

	recordUsage(tool.id);
}

function goLogin() {
	if (isLoggedIn.value) {
		uni.showToast({ title: "已登录", icon: "none" });
		return;
	}

	requireLogin();
}

function requireLogin() {
	uni.showToast({ title: "请先登录", icon: "none" });
	uni.navigateTo({ url: config.app.pages.login });
}

async function toggleFavorite(tool: ToolboxTool) {
	if (!isLoggedIn.value) {
		requireLogin();
		return;
	}

	const next = new Set(favoriteIds.value);
	if (next.has(tool.id)) {
		next.delete(tool.id);
	} else {
		next.add(tool.id);
	}
	favoriteIds.value = next;

	try {
		await request({
			url: `${config.baseUrl}/app/toolbox/favorite`,
			method: "POST",
			data: { toolId: tool.id },
		});
	} catch (err) {
		uni.showToast({ title: (err as Error).message || "收藏同步失败", icon: "none" });
		loadHome();
	}
}

async function recordUsage(toolId: number) {
	try {
		await request({
			url: `${config.baseUrl}/app/toolbox/usage`,
			method: "POST",
			data: { toolId, clientType: "h5" },
		});
	} catch {}
}

async function loadUnreadCount() {
	if (!isLoggedIn.value) {
		unreadCount.value = 0;
		return;
	}

	try {
		const data = (await request({
			url: `${config.baseUrl}/app/message/unreadCount`,
			method: "GET",
		})) as any;
		unreadCount.value = Number(data.count || 0);
	} catch {
		unreadCount.value = 0;
	}
}

async function toggleMessages() {
	if (!isLoggedIn.value) {
		requireLogin();
		return;
	}

	showMessages.value = !showMessages.value;
	if (showMessages.value) {
		await loadMessages();
	}
}

async function loadMessages() {
	messageLoading.value = true;
	try {
		const data = (await request({
			url: `${config.baseUrl}/app/message/list?page=1&size=20`,
			method: "GET",
		})) as any;
		messages.value = data.list || [];
		await loadUnreadCount();
	} catch (err) {
		uni.showToast({ title: (err as Error).message || "消息加载失败", icon: "none" });
	} finally {
		messageLoading.value = false;
	}
}

async function readMessage(item: ToolboxMessage) {
	uni.showModal({
		title: item.title,
		content: item.content || "暂无内容",
		showCancel: false,
	});

	if (item.isRead) {
		return;
	}

	try {
		await request({
			url: `${config.baseUrl}/app/message/read`,
			method: "POST",
			data: { messageId: item.id },
		});
		item.isRead = true;
		await loadUnreadCount();
	} catch {}
}

function normalizeToolUrl(entry: string) {
	try {
		if (/^https?:\/\//i.test(entry)) {
			return entry;
		}

		if (entry.startsWith("/")) {
			return `${config.host}${entry}`;
		}
	} catch {}

	return "";
}
</script>

<style lang="scss" scoped>
.toolbox-mobile {
	min-height: 100vh;
	padding: 36rpx 28rpx 48rpx;
	background:
		linear-gradient(rgba(25, 99, 164, 0.14) 1px, transparent 1px),
		linear-gradient(90deg, rgba(25, 99, 164, 0.14) 1px, transparent 1px),
		#061529;
	background-size: 56rpx 56rpx;
	color: #eff8ff;
	box-sizing: border-box;
}

.hero {
	min-height: 220rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 32rpx;
	border: 1px solid rgba(43, 176, 255, 0.42);
	border-radius: 18rpx;
	background: linear-gradient(135deg, rgba(7, 39, 80, 0.96), rgba(11, 71, 121, 0.62));
	box-shadow: 0 24rpx 60rpx rgba(0, 125, 255, 0.12);
}

.eyebrow,
.desc {
	display: block;
	color: #8cb2d8;
	font-size: 24rpx;
}

.title {
	display: block;
	margin: 12rpx 0;
	color: #3fe9ff;
	font-size: 52rpx;
	font-weight: 800;
}

.hero-actions {
	display: flex;
	flex-direction: column;
	gap: 14rpx;

	button {
		position: relative;
		color: #dff8ff;
		background: rgba(8, 54, 103, 0.72);
		border: 1px solid rgba(64, 223, 255, 0.46);
	}
}

.dot {
	min-width: 28rpx;
	height: 28rpx;
	position: absolute;
	top: -10rpx;
	right: -10rpx;
	padding: 0 8rpx;
	border-radius: 999rpx;
	background: #16d26d;
	color: #fff;
	font-size: 20rpx;
	line-height: 28rpx;
}

.message-panel {
	margin-top: 20rpx;
	padding: 22rpx;
	border: 1px solid rgba(43, 176, 255, 0.34);
	border-radius: 18rpx;
	background: rgba(4, 22, 48, 0.82);
}

.message-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
	font-size: 30rpx;
	font-weight: 800;
}

.message-head button {
	color: #7ff7ff;
	background: rgba(6, 39, 76, 0.88);
	border: 1px solid rgba(43, 176, 255, 0.4);
}

.message-item {
	display: flex;
	justify-content: space-between;
	gap: 16rpx;
	padding: 18rpx 0;
	border-top: 1px solid rgba(43, 176, 255, 0.18);
	color: #9eb4d1;
	font-size: 24rpx;

	text:first-child {
		flex: 1;
		color: #dbefff;
	}

	&.unread text:first-child::before {
		content: "";
		display: inline-block;
		width: 12rpx;
		height: 12rpx;
		margin-right: 10rpx;
		border-radius: 50%;
		background: #16d26d;
	}
}

.message-empty {
	padding: 18rpx 0;
	color: #8ca8c8;
	font-size: 24rpx;
}

.search {
	height: 88rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin: 28rpx 0 22rpx;
	padding: 0 26rpx;
	border: 1px solid rgba(43, 176, 255, 0.45);
	border-radius: 18rpx;
	background: rgba(4, 22, 48, 0.82);

	input {
		flex: 1;
		color: #eef8ff;
		font-size: 28rpx;
	}
}

.categories {
	white-space: nowrap;
	margin-bottom: 28rpx;
}

.category {
	display: inline-flex;
	align-items: center;
	gap: 10rpx;
	height: 68rpx;
	margin-right: 16rpx;
	padding: 0 22rpx;
	border: 1px solid rgba(43, 176, 255, 0.34);
	border-radius: 16rpx;
	color: #a9bfde;
	background: rgba(4, 22, 48, 0.7);

	&.active {
		color: #eefdff;
		border-color: #22c7ff;
		background: rgba(20, 105, 176, 0.78);
		box-shadow: inset 4rpx 0 0 #22e8ff;
	}
}

.section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 18rpx;
	font-size: 34rpx;
	font-weight: 800;
}

.section-head button {
	color: #7ff7ff;
	background: rgba(6, 39, 76, 0.88);
	border: 1px solid rgba(43, 176, 255, 0.4);
}

.error,
.empty,
.offline-tip {
	padding: 28rpx;
	border: 1px solid rgba(255, 120, 120, 0.38);
	border-radius: 16rpx;
	color: #ffd2d2;
	background: rgba(80, 20, 36, 0.28);
}

.offline-tip {
	margin: 20rpx 0;
	border-color: rgba(255, 192, 76, 0.38);
	color: #ffe2a3;
	background: rgba(90, 62, 12, 0.26);
}

.tool-list {
	display: grid;
	gap: 18rpx;
}

.tool-card {
	display: grid;
	grid-template-columns: 96rpx minmax(0, 1fr);
	gap: 22rpx;
	padding: 24rpx;
	border: 1px solid rgba(43, 176, 255, 0.38);
	border-radius: 18rpx;
	background: rgba(7, 36, 72, 0.78);
}

.icon {
	width: 96rpx;
	height: 96rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(64, 223, 255, 0.62);
	border-radius: 18rpx;
	color: #66efff;
	font-size: 30rpx;
	font-weight: 800;
	background: rgba(11, 80, 132, 0.58);
}

.body {
	min-width: 0;
}

.name-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.name {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 32rpx;
	font-weight: 760;
}

.badge {
	padding: 4rpx 12rpx;
	border: 1px solid rgba(255, 192, 76, 0.62);
	border-radius: 10rpx;
	color: #ffd66b;
	font-size: 22rpx;

	&.muted {
		border-color: rgba(139, 163, 195, 0.42);
		color: #9eb4d1;
	}
}

.favorite {
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(139, 163, 195, 0.42);
	border-radius: 14rpx;
	color: #9eb4d1;
	font-size: 28rpx;

	&.active {
		border-color: rgba(255, 192, 76, 0.68);
		color: #ffd66b;
		background: rgba(115, 75, 11, 0.3);
	}
}

.summary {
	display: block;
	margin: 10rpx 0 14rpx;
	color: #9eb4d1;
	font-size: 26rpx;
	line-height: 1.45;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;

	text {
		padding: 4rpx 12rpx;
		border: 1px solid rgba(47, 226, 205, 0.45);
		border-radius: 10rpx;
		color: #43e8d3;
		font-size: 22rpx;
	}
}
</style>
