<template>
	<view class="toolbox-mobile">
		<view class="hero">
			<view>
				<text class="eyebrow">BRMTOOL MOBILE</text>
				<text class="title">数智工具箱</text>
				<text class="desc">工具、学习、AI 创作和消息同步到移动端。</text>
			</view>
			<view class="hero-actions">
				<button size="mini" @tap="openLoginOrMine">
					{{ user.info?.nickName || (isLoggedIn ? "我的" : "登录") }}
				</button>
				<button size="mini" @tap="toggleMessages">
					消息
					<text v-if="unreadCount" class="dot">{{ unreadCount }}</text>
				</button>
			</view>
		</view>

		<view class="search">
			<text>⌕</text>
			<input v-model="keyword" :placeholder="searchPlaceholder" confirm-type="search" @confirm="reloadActive" />
		</view>

		<scroll-view class="tabs" scroll-x>
			<view
				v-for="item in mobileTabs"
				:key="item.code"
				class="tab"
				:class="{ active: activeTab === item.code }"
				@tap="switchTab(item.code)"
			>
				<text>{{ item.icon }}</text>
				<text>{{ item.name }}</text>
				<em>{{ item.count }}</em>
			</view>
		</scroll-view>

		<view v-if="showMessages" class="panel">
			<view class="panel-head">
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
			<view v-if="!messages.length" class="empty small">暂无消息</view>
		</view>

		<view v-if="showLogin" class="panel login-panel">
			<view class="panel-head">
				<text>手机号密码登录</text>
				<button size="mini" @tap="showLogin = false">关闭</button>
			</view>
			<input v-model="loginForm.phone" placeholder="手机号" type="number" />
			<input v-model="loginForm.password" placeholder="密码" password />
			<button class="primary-btn" :loading="isLoggingIn" @tap="loginByPassword">登录</button>
			<text v-if="loginError" class="error-text">{{ loginError }}</text>
		</view>

		<view v-if="activeTab === 'ai'" class="ai-page">
			<view class="ai-head">
				<view>
					<text class="eyebrow">AGENT WORKSPACE</text>
					<text class="ai-title">{{ activeConversation?.title || "今天想创作什么？" }}</text>
				</view>
				<view class="ai-controls">
					<picker :range="modelNames" :value="selectedModelIndex" @change="selectModel">
						<view class="select-chip">{{ selectedModel?.name || "选择模型" }}</view>
					</picker>
					<label class="thinking">
						<checkbox :checked="thinking" @tap="thinking = !thinking" />
						Thinking
					</label>
				</view>
			</view>

			<scroll-view class="template-scroll" scroll-x v-if="!aiMessages.length">
				<view v-for="item in templates" :key="item.id" class="template-card" @tap="useTemplate(item)">
					<text>{{ item.tags?.[0] || "精选" }}</text>
					<text>{{ item.title }}</text>
					<text>{{ item.description }}</text>
				</view>
			</scroll-view>

			<view class="message-list">
				<view
					v-for="item in aiMessages"
					:key="item.localId || item.id"
					class="ai-message"
					:class="item.role"
				>
					<text v-if="item.reasoningContent" class="reasoning">思考：{{ item.reasoningContent }}</text>
					<text>{{ item.content }}</text>
					<view v-if="item.outputUrls?.length" class="output-list">
						<view v-for="url in item.outputUrls" :key="url" class="output-item">
							<image v-if="isImage(url)" :src="url" mode="widthFix" />
							<video v-else-if="isVideo(url)" :src="url" controls />
							<text v-else>{{ url }}</text>
						</view>
					</view>
				</view>
				<view v-if="aiError" class="ai-error">
					<text>{{ aiError }}</text>
					<button size="mini" @tap="sendAi">重试</button>
				</view>
			</view>

			<view class="composer">
				<textarea v-model="aiInput" :placeholder="composerPlaceholder" auto-height />
				<scroll-view class="mode-row" scroll-x>
					<view
						v-for="item in aiModes"
						:key="item.type"
						class="mode-chip"
						:class="{ active: aiMode === item.type }"
						@tap="aiMode = item.type"
					>
						{{ item.label }}
					</view>
				</scroll-view>
				<button class="send-btn" :loading="isAiSending" :disabled="!aiInput.trim()" @tap="sendAi">
					{{ isAiSending ? "生成中" : "发送" }}
				</button>
			</view>
		</view>

		<view v-else-if="activeTab === 'study'" class="study-page">
			<view class="banner study-banner">
				<text>学习中心</text>
				<text>精选技术视频、实战教程与架构指南</text>
			</view>
			<scroll-view class="tabs compact" scroll-x>
				<view
					v-for="item in studyCategories"
					:key="item.code"
					class="tab"
					:class="{ active: activeStudyCategory === item.code }"
					@tap="activeStudyCategory = item.code; loadStudyVideos()"
				>
					{{ item.name }}
				</view>
			</scroll-view>
			<view class="sort-row">
				<button size="mini" :class="{ active: studySort === 'recommend' }" @tap="studySort = 'recommend'; loadStudyVideos()">推荐</button>
				<button size="mini" :class="{ active: studySort === 'hot' }" @tap="studySort = 'hot'; loadStudyVideos()">热门</button>
			</view>
			<view class="study-list">
				<view v-for="item in visibleStudyVideos" :key="item.id" class="study-card" @tap="openStudy(item)">
					<view class="cover">
						<image v-if="item.coverUrl" :src="normalizeAsset(item.coverUrl)" mode="aspectFill" />
						<text v-else>▶</text>
					</view>
					<view>
						<text>{{ item.category }}</text>
						<text>{{ item.title }}</text>
						<text>{{ item.description || "暂无简介" }}</text>
					</view>
				</view>
			</view>
			<view v-if="!visibleStudyVideos.length && !studyLoading" class="empty">暂无学习内容</view>
		</view>

		<view v-else-if="activeTab === 'my'" class="my-page">
			<view class="panel">
				<text class="ai-title">{{ isLoggedIn ? user.info?.nickName || "已登录" : "未登录" }}</text>
				<text class="desc">{{ isLoggedIn ? "收藏、消息和 AI 会话会同步到账号" : "登录后可使用收藏、消息和 AI 功能" }}</text>
				<button v-if="!isLoggedIn" class="primary-btn" @tap="showLogin = true">立即登录</button>
				<button v-else class="primary-btn ghost" @tap="logout">退出登录</button>
			</view>
			<view class="section-head">
				<text>我的收藏</text>
			</view>
			<view class="tool-list">
				<view v-for="tool in favoriteTools" :key="tool.id" class="tool-card" @tap="openTool(tool)">
					<view class="icon">{{ tool.icon }}</view>
					<view class="body">
						<text class="name">{{ tool.name }}</text>
						<text class="summary">{{ tool.description }}</text>
					</view>
				</view>
			</view>
		</view>

		<view v-else class="tool-page">
			<view v-if="activeTab === 'all'" class="banner">
				<text>欢迎使用 数智工具箱</text>
				<text>一站式工具集合，让工作、学习和创作更轻松</text>
			</view>
			<scroll-view v-if="tagFilters.length" class="tabs compact" scroll-x>
				<view class="tab" :class="{ active: !activeTag }" @tap="activeTag = ''">全部</view>
				<view
					v-for="tag in tagFilters"
					:key="tag"
					class="tab"
					:class="{ active: activeTag === tag }"
					@tap="activeTag = tag"
				>
					{{ tag }}
				</view>
			</scroll-view>
			<view class="section-head">
				<text>{{ activeTab === 'favorite' ? "全部收藏" : "推荐工具" }}</text>
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
							<text class="favorite" :class="{ active: favoriteIds.has(tool.id) }" @tap.stop="toggleFavorite(tool)">★</text>
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
	</view>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, reactive } from "vue";
import { config, useStore } from "/@/cool";
import request from "/@/cool/service/request";

type ToolType = "external_link" | "internal_web" | "local_plugin";
type AiMode = "text" | "image" | "audio_music" | "audio_speech" | "video";

interface ToolboxCategory {
	id: number;
	name: string;
	code: string;
	icon?: string;
	sort?: number;
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
	isHot?: number | boolean;
	isNew?: number | boolean;
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

interface StudyCategory {
	id: number;
	name: string;
	code: string;
	sort?: number;
}

interface StudyVideo {
	id: number;
	title: string;
	category: string;
	description?: string;
	coverUrl?: string;
	videoUrl?: string;
	duration?: string;
	author?: string;
	isRecommend?: number | boolean;
	isHot?: number | boolean;
	sort?: number;
}

interface AiModel {
	id: number;
	provider: string;
	capability: AiMode;
	modelId: string;
	name: string;
	isDefault?: number;
	thinkingDefault?: number;
}

interface AiTemplate {
	id: number;
	title: string;
	category: string;
	description?: string;
	prompt: string;
	tags?: string[];
}

interface AiConversation {
	id: number;
	title: string;
	modelId: string;
}

interface AiMessage {
	id?: number;
	localId?: string;
	role: "user" | "assistant";
	content?: string;
	reasoningContent?: string;
	outputUrls?: string[];
}

const { user } = useStore();

const keyword = ref("");
const activeTab = ref("all");
const activeTag = ref("");
const loading = ref(false);
const error = ref("");
const categories = ref<ToolboxCategory[]>([
	{ id: 0, name: "首页", code: "all", icon: "首" },
	{ id: 103, name: "导航", code: "nav", icon: "航" },
	{ id: 102, name: "工具", code: "tool", icon: "工" },
	{ id: 104, name: "智能", code: "ai", icon: "智" },
	{ id: 105, name: "学习", code: "study", icon: "学" },
]);
const tools = ref<ToolboxTool[]>([]);
const favoriteIds = ref(new Set<number>());
const unreadCount = ref(0);
const messages = ref<ToolboxMessage[]>([]);
const showMessages = ref(false);
const messageLoading = ref(false);
const showLogin = ref(false);
const isLoggingIn = ref(false);
const loginError = ref("");
const loginForm = reactive({ phone: "", password: "" });
const studyCategories = ref<StudyCategory[]>([{ id: 0, name: "全部内容", code: "all" }]);
const activeStudyCategory = ref("all");
const studySort = ref<"recommend" | "hot">("recommend");
const studyVideos = ref<StudyVideo[]>([]);
const studyLoading = ref(false);
const aiModels = ref<AiModel[]>([]);
const templates = ref<AiTemplate[]>([]);
const selectedModelId = ref("");
const thinking = ref(true);
const aiMode = ref<AiMode>("text");
const aiInput = ref("");
const aiMessages = ref<AiMessage[]>([]);
const activeConversation = ref<AiConversation | null>(null);
const isAiSending = ref(false);
const aiError = ref("");

const aiModes = [
	{ type: "text" as const, label: "Agent 模式" },
	{ type: "image" as const, label: "图片生成" },
	{ type: "audio_music" as const, label: "音乐生成" },
	{ type: "audio_speech" as const, label: "语音生成" },
	{ type: "video" as const, label: "视频生成" },
];

const isLoggedIn = computed(() => Boolean(user.token));
const categoryMap = computed(() => new Map(categories.value.map((item) => [item.id, item])));
const favoriteTools = computed(() => tools.value.filter((item) => favoriteIds.value.has(item.id)).sort(compareSort));
const modelNames = computed(() => aiModels.value.map((item) => item.name));
const selectedModelIndex = computed(() => Math.max(0, aiModels.value.findIndex((item) => item.modelId === selectedModelId.value)));
const selectedModel = computed(() => aiModels.value.find((item) => item.modelId === selectedModelId.value));
const searchPlaceholder = computed(() => {
	if (activeTab.value === "ai") return "搜索 AI 助手、提示词、生成任务...";
	if (activeTab.value === "study") return "搜索视频教程、课程、指南...";
	return "搜索工具、关键词";
});
const composerPlaceholder = computed(() => {
	if (aiMode.value === "image") return "描述你要生成的图片，默认 1080P";
	if (aiMode.value === "audio_music") return "描述音乐风格、节奏、情绪和用途";
	if (aiMode.value === "audio_speech") return "输入需要合成的语音文案";
	if (aiMode.value === "video") return "描述视频画面、镜头和运动";
	return "输入想法、脚本或任务，和 Agent 一起创作";
});
const mobileTabs = computed(() => {
	return [
		...categories.value.map((item) => ({
			code: item.code,
			name: item.name,
			icon: item.icon || item.name.slice(0, 1),
			count:
				item.code === "all"
					? tools.value.length
					: item.code === "ai"
						? aiModels.value.length
						: item.code === "study"
							? studyVideos.value.length
							: tools.value.filter((tool) => categoryMap.value.get(tool.categoryId || 0)?.code === item.code).length,
		})),
		{ code: "my", name: "我的", icon: "我", count: favoriteIds.value.size },
	];
});
const tagFilters = computed(() => {
	if (!["nav", "tool"].includes(activeTab.value)) return [];
	const set = new Set<string>();
	tools.value.forEach((tool) => {
		if (categoryMap.value.get(tool.categoryId || 0)?.code === activeTab.value) {
			(tool.tags || []).forEach((tag) => set.add(tag));
		}
	});
	return Array.from(set);
});
const visibleTools = computed(() => {
	const key = keyword.value.trim().toLowerCase();
	return tools.value
		.filter((tool) => {
			const category = categoryMap.value.get(tool.categoryId || 0);
			const matchCategory =
				activeTab.value === "all" ||
				activeTab.value === "favorite" ||
				category?.code === activeTab.value;
			const matchTag = !activeTag.value || (tool.tags || []).includes(activeTag.value);
			const searchable = [tool.name, tool.description, tool.keywords, ...(tool.tags || [])]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return matchCategory && matchTag && (!key || searchable.includes(key));
		})
		.sort(compareSort);
});
const visibleStudyVideos = computed(() => {
	const key = keyword.value.trim().toLowerCase();
	return studyVideos.value.filter((item) => {
		const text = [item.title, item.description, item.author, item.category].filter(Boolean).join(" ").toLowerCase();
		return !key || text.includes(key);
	});
});

onMounted(() => {
	loadHome();
	loadStudyMeta();
	loadAiMeta();
	loadUnreadCount();
});

function switchTab(code: string) {
	activeTab.value = code;
	activeTag.value = "";
	if (code === "study") loadStudyVideos();
	if (code === "ai" && isLoggedIn.value) loadAiMeta();
}

function reloadActive() {
	if (activeTab.value === "study") loadStudyVideos();
	else loadHome();
}

async function loadHome() {
	loading.value = true;
	error.value = "";
	try {
		const data = (await request({
			url: `${config.baseUrl}/app/toolbox/home`,
			method: "GET",
		})) as any;
		categories.value = normalizeCategories(data.categories || []);
		const map = new Map<string, ToolboxTool>();
		["recommendTools", "newTools", "hotTools", "favoriteTools", "recentTools"].forEach((key) => {
			(data[key] || []).forEach((tool: ToolboxTool) => {
				map.set(tool.code || String(tool.id), normalizeTool(tool));
			});
		});
		tools.value = Array.from(map.values()).sort(compareSort);
		favoriteIds.value = new Set(tools.value.filter((item) => item.isFavorite).map((item) => item.id));
	} catch (err) {
		error.value = (err as Error).message || "工具箱接口暂不可用";
	} finally {
		loading.value = false;
	}
}

function normalizeCategories(list: ToolboxCategory[]) {
	const map = new Map<string, ToolboxCategory>();
	[...categories.value, ...list].forEach((item) => {
		map.set(item.code, { ...item, icon: item.icon || item.name.slice(0, 1) });
	});
	return Array.from(map.values()).sort((a, b) => {
		if (a.code === "all") return -1;
		if (b.code === "all") return 1;
		return Number(b.sort || 0) - Number(a.sort || 0);
	});
}

function normalizeTool(tool: ToolboxTool): ToolboxTool {
	return {
		...tool,
		icon: tool.icon || tool.name.slice(0, 1),
		tags: Array.isArray(tool.tags) ? tool.tags : [],
	};
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

	// #ifdef H5
	uni.navigateTo({
		url: `/pages/toolbox/webview?title=${encodeURIComponent(tool.name)}&url=${encodeURIComponent(url)}`,
	});
	// #endif

	// #ifndef H5
	uni.showModal({
		title: "外链工具",
		content: "小程序端无法直接打开部分外链，已为你复制链接，可在浏览器中访问。",
		confirmText: "复制链接",
		success(res) {
			if (res.confirm) {
				uni.setClipboardData({ data: url });
			}
		},
	});
	// #endif

	recordUsage(tool.id);
}

function normalizeToolUrl(entry: string) {
	if (/^https?:\/\//i.test(entry)) return entry;
	if (entry?.startsWith("/")) return `${config.host}${entry}`;
	return "";
}

async function toggleFavorite(tool: ToolboxTool) {
	if (!isLoggedIn.value) {
		requireLogin();
		return;
	}
	const next = new Set(favoriteIds.value);
	next.has(tool.id) ? next.delete(tool.id) : next.add(tool.id);
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
			data: { toolId, clientType: "mobile" },
		});
	} catch {}
}

async function loadStudyMeta() {
	try {
		const data = (await request({
			url: `${config.baseUrl}/app/toolbox/study/categories`,
			method: "GET",
		})) as StudyCategory[];
		studyCategories.value = [{ id: 0, name: "全部内容", code: "all" }, ...(data || [])];
		await loadStudyVideos();
	} catch {}
}

async function loadStudyVideos() {
	studyLoading.value = true;
	try {
		const category = activeStudyCategory.value === "all" ? "" : activeStudyCategory.value;
		const data = (await request({
			url: `${config.baseUrl}/app/toolbox/study/videos?page=1&size=50&sort=${studySort.value}&category=${category}&keyword=${encodeURIComponent(keyword.value.trim())}`,
			method: "GET",
		})) as any;
		studyVideos.value = data.list || [];
	} finally {
		studyLoading.value = false;
	}
}

async function openStudy(item: StudyVideo) {
	if (!item.videoUrl) {
		uni.showModal({ title: item.title, content: item.description || "暂无详情", showCancel: false });
		return;
	}
	// #ifdef H5
	uni.navigateTo({
		url: `/pages/toolbox/webview?title=${encodeURIComponent(item.title)}&url=${encodeURIComponent(normalizeAsset(item.videoUrl))}`,
	});
	// #endif
	// #ifndef H5
	uni.setClipboardData({ data: normalizeAsset(item.videoUrl) });
	uni.showToast({ title: "学习地址已复制", icon: "none" });
	// #endif
}

async function loadAiMeta() {
	if (!isLoggedIn.value) return;
	try {
		const [models, tpl] = await Promise.all([
			request({ url: `${config.baseUrl}/app/ai/models`, method: "GET" }) as Promise<any>,
			request({ url: `${config.baseUrl}/app/ai/templates`, method: "GET" }) as Promise<any>,
		]);
		aiModels.value = models.list || [];
		templates.value = tpl.list || [];
		const defaultModel = aiModels.value.find((item) => item.capability === "text" && item.isDefault) ||
			aiModels.value.find((item) => item.capability === "text");
		if (defaultModel && !selectedModelId.value) {
			selectedModelId.value = defaultModel.modelId;
			thinking.value = Boolean(defaultModel.thinkingDefault);
		}
	} catch {}
}

function selectModel(event: any) {
	const index = Number(event.detail.value || 0);
	selectedModelId.value = aiModels.value[index]?.modelId || selectedModelId.value;
}

function useTemplate(item: AiTemplate) {
	aiInput.value = item.prompt;
}

async function sendAi() {
	if (!isLoggedIn.value) {
		requireLogin();
		return;
	}
	if (!aiInput.value.trim()) return;
	const prompt = aiInput.value.trim();
	aiError.value = "";
	isAiSending.value = true;
	aiMessages.value.push({ localId: `u-${Date.now()}`, role: "user", content: prompt });
	aiInput.value = "";
	try {
		if (aiMode.value === "text") {
			const data = (await request({
				url: `${config.baseUrl}/app/ai/chat/send`,
				method: "POST",
				data: {
					conversationId: activeConversation.value?.id,
					content: prompt,
					modelId: selectedModelId.value,
					thinking: thinking.value,
					mode: "agent",
				},
			})) as any;
			activeConversation.value = data.conversation;
			aiMessages.value.push({ ...data.message, role: "assistant" });
		} else {
			const model = aiModels.value.find((item) => item.capability === aiMode.value && item.isDefault) ||
				aiModels.value.find((item) => item.capability === aiMode.value);
			const data = (await request({
				url: `${config.baseUrl}/app/ai/generate`,
				method: "POST",
				data: {
					conversationId: activeConversation.value?.id,
					type: aiMode.value,
					prompt,
					modelId: model?.modelId,
					size: aiMode.value === "image" ? "1080P" : undefined,
				},
			})) as any;
			activeConversation.value = data.conversation;
			aiMessages.value.push({
				...data.message,
				role: "assistant",
				outputUrls: data.generation?.outputUrls || [],
			});
		}
	} catch (err) {
		aiError.value = friendlyError((err as Error).message);
	} finally {
		isAiSending.value = false;
	}
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
	if (showMessages.value) await loadMessages();
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
	uni.showModal({ title: item.title, content: item.content || "暂无内容", showCancel: false });
	if (item.isRead) return;
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

function openLoginOrMine() {
	if (isLoggedIn.value) {
		activeTab.value = "my";
		return;
	}
	showLogin.value = true;
}

async function loginByPassword() {
	isLoggingIn.value = true;
	loginError.value = "";
	try {
		const token = (await request({
			url: `${config.baseUrl}/app/user/login/password`,
			method: "POST",
			data: loginForm,
		})) as any;
		user.setToken(token);
		await user.get();
		showLogin.value = false;
		await Promise.all([loadHome(), loadUnreadCount(), loadAiMeta()]);
	} catch (err) {
		loginError.value = (err as Error).message || "登录失败";
	} finally {
		isLoggingIn.value = false;
	}
}

function logout() {
	user.clear();
	favoriteIds.value = new Set();
	unreadCount.value = 0;
	aiMessages.value = [];
}

function requireLogin() {
	uni.showToast({ title: "请先登录", icon: "none" });
	showLogin.value = true;
}

function normalizeAsset(url?: string) {
	if (!url) return "";
	if (/^https?:\/\//i.test(url)) return url;
	if (url.startsWith("/")) return `${config.host}${url}`;
	return `${config.host}/${url}`;
}

function compareSort(a: { sort?: number; id?: number }, b: { sort?: number; id?: number }) {
	return Number(b.sort || 0) - Number(a.sort || 0) || Number(b.id || 0) - Number(a.id || 0);
}

function friendlyError(message = "") {
	if (message.includes("超时") || message.includes("timeout")) return "应用接口请求超时，请稍后重试。";
	if (message.includes("model") || message.includes("endpoint")) return "模型或接入点不可用，请到后台 AI 模型管理确认。";
	if (message.includes("size")) return "生成尺寸参数不合法，图片默认使用 1080P。";
	return message || "请求失败，请稍后重试";
}

function isImage(url: string) {
	return /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(url);
}

function isVideo(url: string) {
	return /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(url);
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

.hero,
.banner,
.panel {
	border: 1px solid rgba(43, 176, 255, 0.42);
	border-radius: 20rpx;
	background: linear-gradient(135deg, rgba(7, 39, 80, 0.96), rgba(11, 71, 121, 0.62));
	box-shadow: 0 24rpx 60rpx rgba(0, 125, 255, 0.12);
}

.hero {
	min-height: 220rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 32rpx;
}

.eyebrow,
.desc,
.summary,
.study-card text:nth-child(3),
.template-card text:nth-child(3) {
	display: block;
	color: #8cb2d8;
	font-size: 24rpx;
	line-height: 1.55;
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
}

button {
	color: #dff8ff;
	background: rgba(8, 54, 103, 0.72);
	border: 1px solid rgba(64, 223, 255, 0.46);
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
}

.search input,
.login-panel input {
	flex: 1;
	color: #eef8ff;
	font-size: 28rpx;
}

.tabs {
	white-space: nowrap;
	margin-bottom: 28rpx;
}

.tabs.compact {
	margin: 22rpx 0;
}

.tab,
.mode-chip,
.select-chip {
	display: inline-flex;
	align-items: center;
	gap: 10rpx;
	min-height: 66rpx;
	margin-right: 16rpx;
	padding: 0 22rpx;
	border: 1px solid rgba(43, 176, 255, 0.34);
	border-radius: 16rpx;
	color: #a9bfde;
	background: rgba(4, 22, 48, 0.7);
}

.tab.active,
.mode-chip.active,
.sort-row .active {
	color: #eefdff;
	border-color: #22c7ff;
	background: rgba(20, 105, 176, 0.78);
	box-shadow: inset 4rpx 0 0 #22e8ff;
}

.tab em {
	min-width: 30rpx;
	border-radius: 999rpx;
	background: rgba(24, 205, 188, 0.24);
	color: #5effe8;
	text-align: center;
	font-style: normal;
	font-size: 22rpx;
}

.panel {
	margin: 20rpx 0;
	padding: 24rpx;
}

.panel-head,
.section-head,
.sort-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 18rpx;
	font-size: 34rpx;
	font-weight: 800;
}

.login-panel {
	display: grid;
	gap: 18rpx;
}

.login-panel input {
	height: 82rpx;
	padding: 0 20rpx;
	border: 1px solid rgba(43, 176, 255, 0.35);
	border-radius: 16rpx;
	background: rgba(4, 22, 48, 0.82);
}

.primary-btn {
	height: 82rpx;
	border-radius: 16rpx;
	background: rgba(20, 105, 176, 0.88);
}

.primary-btn.ghost {
	background: rgba(4, 22, 48, 0.82);
}

.error-text,
.ai-error {
	color: #ffd2d2;
}

.message-item {
	display: flex;
	justify-content: space-between;
	gap: 16rpx;
	padding: 18rpx 0;
	border-top: 1px solid rgba(43, 176, 255, 0.18);
	color: #9eb4d1;
	font-size: 24rpx;
}

.message-item text:first-child {
	flex: 1;
	color: #dbefff;
}

.message-item.unread text:first-child::before {
	content: "";
	display: inline-block;
	width: 12rpx;
	height: 12rpx;
	margin-right: 10rpx;
	border-radius: 50%;
	background: #16d26d;
}

.banner {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	min-height: 160rpx;
	justify-content: center;
	padding: 30rpx;
	margin-bottom: 24rpx;
}

.banner text:first-child {
	color: #3fe9ff;
	font-size: 38rpx;
	font-weight: 900;
}

.tool-list,
.study-list,
.message-list {
	display: grid;
	gap: 18rpx;
}

.tool-card,
.study-card,
.template-card,
.ai-message {
	border: 1px solid rgba(43, 176, 255, 0.38);
	border-radius: 18rpx;
	background: rgba(7, 36, 72, 0.78);
}

.tool-card {
	display: grid;
	grid-template-columns: 96rpx minmax(0, 1fr);
	gap: 22rpx;
	padding: 24rpx;
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

.name-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.name {
	flex: 1;
	color: #f2fbff;
	font-size: 30rpx;
	font-weight: 800;
}

.badge,
.tags text,
.study-card text:first-child,
.template-card text:first-child {
	display: inline-flex;
	margin: 8rpx 8rpx 0 0;
	padding: 4rpx 12rpx;
	border: 1px solid rgba(38, 224, 199, 0.45);
	border-radius: 8rpx;
	color: #61ffe7;
	font-size: 22rpx;
}

.badge.muted {
	color: #ffd978;
	border-color: rgba(255, 217, 120, 0.45);
}

.favorite {
	color: #667794;
	font-size: 34rpx;
}

.favorite.active {
	color: #ffd761;
}

.empty,
.error {
	padding: 28rpx;
	border: 1px solid rgba(255, 120, 120, 0.38);
	border-radius: 16rpx;
	color: #ffd2d2;
	background: rgba(80, 20, 36, 0.28);
}

.empty.small {
	color: #8ca8c8;
	border-color: rgba(43, 176, 255, 0.2);
	background: transparent;
}

.study-card {
	overflow: hidden;
}

.cover {
	height: 260rpx;
	background: rgba(4, 22, 48, 0.82);
	display: flex;
	align-items: center;
	justify-content: center;
	color: #3fe9ff;
	font-size: 54rpx;
}

.cover image {
	width: 100%;
	height: 100%;
}

.study-card > view:last-child {
	display: grid;
	gap: 8rpx;
	padding: 22rpx;
}

.study-card text:nth-child(2) {
	color: #f2fbff;
	font-size: 30rpx;
	font-weight: 800;
}

.ai-head {
	display: grid;
	gap: 18rpx;
	padding: 8rpx 0 24rpx;
}

.ai-title {
	display: block;
	margin-top: 8rpx;
	color: #f2fbff;
	font-size: 42rpx;
	font-weight: 900;
}

.ai-controls {
	display: flex;
	gap: 14rpx;
	align-items: center;
	flex-wrap: wrap;
}

.thinking {
	display: flex;
	align-items: center;
	gap: 6rpx;
	color: #b9cee8;
}

.template-scroll {
	white-space: nowrap;
	margin-bottom: 22rpx;
}

.template-card {
	display: inline-grid;
	gap: 8rpx;
	width: 420rpx;
	min-height: 160rpx;
	margin-right: 18rpx;
	padding: 22rpx;
	box-sizing: border-box;
}

.template-card text:nth-child(2) {
	color: #f2fbff;
	font-size: 30rpx;
	font-weight: 800;
}

.ai-message {
	padding: 22rpx;
	color: #dfefff;
	line-height: 1.7;
}

.ai-message.user {
	margin-left: 80rpx;
	background: rgba(255, 255, 255, 0.08);
}

.ai-message.assistant {
	margin-right: 40rpx;
}

.reasoning {
	display: block;
	margin-bottom: 12rpx;
	color: #80cbe3;
}

.output-list {
	display: grid;
	gap: 12rpx;
	margin-top: 16rpx;
}

.output-item image,
.output-item video {
	width: 100%;
	border-radius: 16rpx;
}

.composer {
	position: sticky;
	bottom: 18rpx;
	margin-top: 26rpx;
	padding: 20rpx;
	border: 1px solid rgba(88, 110, 132, 0.55);
	border-radius: 24rpx;
	background: rgba(22, 26, 34, 0.96);
}

.composer textarea {
	width: 100%;
	min-height: 92rpx;
	color: #eef8ff;
	line-height: 1.6;
}

.mode-row {
	white-space: nowrap;
	margin: 14rpx 0;
}

.send-btn {
	width: 100%;
	height: 78rpx;
	border-radius: 999rpx;
	background: #dbe8f9;
	color: #08172b;
	font-weight: 800;
}
</style>
