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
		<view v-if="cacheNotice" class="cache-banner">
			<text>{{ cacheNotice }}</text>
			<button size="mini" @tap="reloadActive">重试</button>
		</view>

		<view v-if="showMessages" class="panel">
			<view class="panel-head">
				<text>消息通知</text>
				<button size="mini" :loading="messageLoading" @tap="loadMessages">刷新</button>
			</view>
			<view v-if="messageLoading && !messages.length" class="loading-list">
				<view v-for="item in 3" :key="item" class="loading-row" />
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
			<view v-if="messageError" class="empty-state compact">
				<text>消息加载失败</text>
				<text>{{ messageError }}</text>
				<button size="mini" @tap="loadMessages">重试</button>
			</view>
			<view v-else-if="!messages.length" class="empty-state compact">
				<text>暂无消息</text>
				<text>新的通知会在这里同步显示。</text>
			</view>
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

			<view v-if="!isLoggedIn" class="empty-state">
				<text>登录后开启 AI 工作台</text>
				<text>模型、模板、会话和生成记录会同步到你的账号。</text>
				<button size="mini" @tap="showLogin = true">去登录</button>
			</view>
			<view v-else-if="aiMetaError && !aiModels.length" class="empty-state">
				<text>AI 配置加载失败</text>
				<text>{{ aiMetaError }}</text>
				<button size="mini" @tap="loadAiMeta">重试</button>
			</view>
			<view v-else-if="aiMetaLoading && !aiModels.length" class="loading-grid">
				<view v-for="item in 3" :key="item" class="loading-card" />
			</view>
			<view v-else-if="!aiModels.length && !aiMessages.length" class="empty-state">
				<text>暂无可用 AI 模型</text>
				<text>请在后台 AI 模型管理中启用文本或多模态模型。</text>
				<button size="mini" @tap="loadAiMeta">刷新配置</button>
			</view>

			<scroll-view class="template-scroll" scroll-x v-if="isLoggedIn && !aiMessages.length && templates.length">
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
			<view v-if="studyError" class="empty-state">
				<text>学习内容加载失败</text>
				<text>{{ studyError }}</text>
				<button size="mini" @tap="loadStudyVideos">重试</button>
			</view>
			<view v-if="studyLoading && !studyVideos.length" class="loading-grid">
				<view v-for="item in 2" :key="item" class="loading-card tall" />
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
			<view v-if="!visibleStudyVideos.length && !studyLoading && !studyError" class="empty-state">
				<text>暂无学习内容</text>
				<text>{{ keyword ? "换个关键词试试，或清空搜索后刷新。" : "后台发布学习内容后会显示在这里。" }}</text>
				<button size="mini" @tap="loadStudyVideos">刷新</button>
			</view>
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
			<view v-if="!favoriteTools.length" class="empty-state">
				<text>还没有收藏</text>
				<text>在工具卡片上点亮星标，常用工具会集中到这里。</text>
				<button size="mini" @tap="activeTab = 'all'">去看看工具</button>
			</view>
			<view class="section-head self-check-head">
				<text>联调自检</text>
				<view class="self-check-actions">
					<button size="mini" @tap="copySelfCheckReport">复制</button>
					<button size="mini" :loading="selfCheckLoading" @tap="runMobileSelfCheck">检查</button>
				</view>
			</view>
			<view class="check-summary">
				<view v-for="item in selfCheckSummary" :key="item.label">
					<text>{{ item.label }}</text>
					<text>{{ item.value }}</text>
				</view>
			</view>
			<view class="check-list">
				<view
					v-for="item in selfCheckItems"
					:key="item.key"
					class="check-item"
					:class="item.status"
					@tap="openSelfCheckTarget(item.target)"
				>
					<view>
						<text>{{ item.title }}</text>
						<text>{{ item.description }}</text>
					</view>
					<text class="check-status">{{ item.label }}</text>
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
			<view v-if="error" class="empty-state warning">
				<text>工具数据加载失败</text>
				<text>{{ error }}</text>
				<button size="mini" @tap="loadHome">重试</button>
			</view>
			<view v-if="loading && !tools.length" class="loading-grid">
				<view v-for="item in 4" :key="item" class="loading-card" />
			</view>
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
			<view v-if="!visibleTools.length && !loading && !error" class="empty-state">
				<text>{{ activeTab === "favorite" ? "暂无收藏工具" : "暂无可展示工具" }}</text>
				<text>{{ keyword ? "当前搜索没有命中，清空关键词或切换分类试试。" : "后台发布工具后会显示在这里。" }}</text>
				<button size="mini" @tap="reloadActive">刷新</button>
			</view>
		</view>
	</view>
</template>

<script lang="ts" setup>
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { computed, onMounted, ref, reactive } from "vue";
import { config, useStore } from "/@/cool";
import request from "/@/cool/service/request";

type ToolType = "external_link" | "internal_web" | "local_plugin";
type AiMode = "text" | "image" | "audio_music" | "audio_speech" | "video";
type CheckStatus = "ok" | "warn" | "todo";
type SelfCheckTarget = "tools" | "study" | "ai" | "messages";

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

interface CacheEntry<T> {
	savedAt: number;
	data: T;
}

interface CachedHome {
	categories: ToolboxCategory[];
	tools: ToolboxTool[];
}

interface CachedStudy {
	categories: StudyCategory[];
	videos: StudyVideo[];
}

interface CachedAiMeta {
	models: AiModel[];
	templates: AiTemplate[];
}

const { user } = useStore();

const CACHE_KEYS = {
	home: "brmtool:p20:mobile:home:v1",
	study: "brmtool:p20:mobile:study:v1",
	ai: "brmtool:p20:mobile:ai-meta:v1",
};

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
const messageError = ref("");
const showLogin = ref(false);
const isLoggingIn = ref(false);
const loginError = ref("");
const loginForm = reactive({ phone: "", password: "" });
const studyCategories = ref<StudyCategory[]>([{ id: 0, name: "全部内容", code: "all" }]);
const activeStudyCategory = ref("all");
const studySort = ref<"recommend" | "hot">("recommend");
const studyVideos = ref<StudyVideo[]>([]);
const studyLoading = ref(false);
const studyError = ref("");
const aiModels = ref<AiModel[]>([]);
const templates = ref<AiTemplate[]>([]);
const aiMetaError = ref("");
const aiMetaLoading = ref(false);
const selectedModelId = ref("");
const thinking = ref(true);
const aiMode = ref<AiMode>("text");
const aiInput = ref("");
const aiMessages = ref<AiMessage[]>([]);
const activeConversation = ref<AiConversation | null>(null);
const isAiSending = ref(false);
const aiError = ref("");
const selfCheckLoading = ref(false);
const lastSelfCheckAt = ref("");
const cacheFallbacks = reactive({
	tools: "",
	study: "",
	ai: "",
});

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
const selfCheckSummary = computed(() => [
	{ label: "接口", value: config.baseUrl || "/api" },
	{ label: "身份", value: isLoggedIn.value ? user.info?.nickName || "已登录" : "未登录" },
	{ label: "数据", value: `工具 ${tools.value.length} / 学习 ${studyVideos.value.length} / AI ${aiModels.value.length}` },
	{ label: "缓存", value: cacheFallbackSummary.value },
	{ label: "检查", value: lastSelfCheckAt.value || "未执行" },
]);
const cacheNotice = computed(() => Object.values(cacheFallbacks).filter(Boolean).join("；"));
const cacheFallbackSummary = computed(() => {
	const scopes = [
		cacheFallbacks.tools ? "工具" : "",
		cacheFallbacks.study ? "学习" : "",
		cacheFallbacks.ai ? "AI" : "",
	].filter(Boolean);
	return scopes.length ? `${scopes.join("/")} 使用缓存` : "未使用";
});
const selfCheckItems = computed(() => {
	const webTools = tools.value.filter((item) => item.type !== "local_plugin" && normalizeToolUrl(item.entry));
	const items: Array<{
		key: string;
		title: string;
		description: string;
		label: string;
		status: CheckStatus;
		target: SelfCheckTarget;
	}> = [
		{
			key: "tools",
			title: "工具数据",
			description: tools.value.length ? "首页、分类、搜索和收藏可继续回归。" : error.value || "点击检查同步工具首页接口。",
			label: tools.value.length ? `${tools.value.length} 个` : error.value ? "需重试" : "待检查",
			status: tools.value.length ? "ok" : error.value ? "warn" : "todo",
			target: "tools",
		},
		{
			key: "open",
			title: "移动端打开",
			description: webTools.length ? "H5 进入 web-view，小程序端复制链接兜底。" : "暂无可在移动端打开的 Web 工具。",
			label: webTools.length ? `${webTools.length} 个` : "待配置",
			status: webTools.length ? "ok" : "todo",
			target: "tools",
		},
		{
			key: "study",
			title: "学习中心",
			description: studyVideos.value.length ? "分类、排序和视频卡片已拿到数据。" : studyError.value || "点击检查同步学习列表。",
			label: studyVideos.value.length ? `${studyVideos.value.length} 条` : studyError.value ? "需重试" : "待检查",
			status: studyVideos.value.length ? "ok" : studyError.value ? "warn" : "todo",
			target: "study",
		},
		{
			key: "ai",
			title: "AI 工作台",
			description: aiSelfCheckDescription(),
			label: !isLoggedIn.value ? "需登录" : aiModels.value.length ? `${aiModels.value.length} 个` : aiMetaError.value ? "需重试" : "待检查",
			status: !isLoggedIn.value ? "todo" : aiModels.value.length ? "ok" : aiMetaError.value ? "warn" : "todo",
			target: "ai",
		},
		{
			key: "message",
			title: "消息通知",
			description: !isLoggedIn.value ? "登录后检查未读数和消息列表。" : messageError.value || "可打开消息面板验证列表和已读。",
			label: !isLoggedIn.value ? "需登录" : messageError.value ? "需重试" : unreadCount.value ? `${unreadCount.value} 未读` : "可验证",
			status: !isLoggedIn.value ? "todo" : messageError.value ? "warn" : "ok",
			target: "messages",
		},
	];
	return items;
});

function aiSelfCheckDescription() {
	if (!isLoggedIn.value) return "登录后检查模型、模板和生成接口。";
	if (aiModels.value.length) return "模型配置已加载，可继续验证文本和多模态生成。";
	return aiMetaError.value || "点击检查同步 AI 模型配置。";
}

onMounted(() => {
	loadHome();
	loadStudyMeta();
	loadAiMeta();
	loadUnreadCount();
});

onPullDownRefresh(async () => {
	try {
		await refreshActive();
	} finally {
		uni.stopPullDownRefresh();
	}
});

function switchTab(code: string) {
	activeTab.value = code;
	activeTag.value = "";
	if (code === "study") loadStudyVideos();
	if (code === "ai" && isLoggedIn.value) loadAiMeta();
}

function reloadActive() {
	refreshActive();
}

async function refreshActive() {
	if (activeTab.value === "study") {
		await Promise.all([loadStudyVideos(), loadUnreadCount()]);
	} else if (activeTab.value === "ai") {
		await Promise.all([loadAiMeta(), loadUnreadCount()]);
	} else {
		await Promise.all([loadHome(), loadUnreadCount()]);
	}
	if (showMessages.value) {
		await loadMessages();
	}
}

async function runMobileSelfCheck() {
	selfCheckLoading.value = true;
	try {
		await Promise.all([
			loadHome(),
			loadStudyMeta(),
			isLoggedIn.value ? loadAiMeta() : Promise.resolve(),
			isLoggedIn.value ? loadUnreadCount() : Promise.resolve(),
		]);
		lastSelfCheckAt.value = formatCheckTime(new Date());
		uni.showToast({ title: "检查完成", icon: "none" });
	} finally {
		selfCheckLoading.value = false;
	}
}

function openSelfCheckTarget(target: SelfCheckTarget) {
	if (target === "messages") {
		if (!isLoggedIn.value) {
			requireLogin();
			return;
		}
		showMessages.value = true;
		loadMessages();
		return;
	}
	if (target === "ai" && !isLoggedIn.value) {
		requireLogin();
		return;
	}
	activeTab.value = target === "tools" ? "all" : target;
	if (target === "study") loadStudyVideos();
	if (target === "ai") loadAiMeta();
}

function copySelfCheckReport() {
	const report = [
		"数智工具箱移动端联调自检",
		`接口：${config.baseUrl || "/api"}`,
		`身份：${isLoggedIn.value ? user.info?.nickName || "已登录" : "未登录"}`,
		`最近检查：${lastSelfCheckAt.value || "未执行"}`,
		`缓存：${cacheFallbackSummary.value}`,
		`失败摘要：${failureSummary() || "无"}`,
		`数据：工具 ${tools.value.length} / Web 工具 ${mobileWebToolCount()} / 学习 ${studyVideos.value.length} / AI ${aiModels.value.length} / 未读 ${unreadCount.value}`,
		...selfCheckItems.value.map((item) => `${item.title}：${item.label}｜${item.description}`),
	].join("\n");
	uni.setClipboardData({
		data: report,
		success() {
			uni.showToast({ title: "自检报告已复制", icon: "none" });
		},
		fail() {
			uni.showToast({ title: "复制失败，请手动截图", icon: "none" });
		},
	});
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
		cacheFallbacks.tools = "";
		writeLocalCache<CachedHome>(CACHE_KEYS.home, {
			categories: categories.value,
			tools: toCacheableTools(tools.value),
		});
	} catch (err) {
		const cached = readLocalCache<CachedHome>(CACHE_KEYS.home);
		if (cached) {
			categories.value = normalizeCategories(cached.data.categories || []);
			tools.value = (cached.data.tools || []).map(normalizeTool).sort(compareSort);
			cacheFallbacks.tools = `工具接口失败，已显示 ${formatCacheTime(cached.savedAt)} 缓存`;
			error.value = `${friendlyError((err as Error).message || "工具箱接口暂不可用")}，已显示最近缓存`;
		} else {
			error.value = friendlyError((err as Error).message || "工具箱接口暂不可用");
		}
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
	} catch (err) {
		const cached = readLocalCache<CachedStudy>(CACHE_KEYS.study);
		if (cached) {
			studyCategories.value = cached.data.categories || [{ id: 0, name: "全部内容", code: "all" }];
			studyVideos.value = cached.data.videos || [];
			cacheFallbacks.study = `学习接口失败，已显示 ${formatCacheTime(cached.savedAt)} 缓存`;
			studyError.value = `${friendlyError((err as Error).message)}，已显示最近缓存`;
		} else {
			studyError.value = friendlyError((err as Error).message);
		}
	}
}

async function loadStudyVideos() {
	studyLoading.value = true;
	studyError.value = "";
	try {
		const category = activeStudyCategory.value === "all" ? "" : activeStudyCategory.value;
		const data = (await request({
			url: `${config.baseUrl}/app/toolbox/study/videos?page=1&size=50&sort=${studySort.value}&category=${category}&keyword=${encodeURIComponent(keyword.value.trim())}`,
			method: "GET",
		})) as any;
		studyVideos.value = data.list || [];
		cacheFallbacks.study = "";
		writeLocalCache<CachedStudy>(CACHE_KEYS.study, {
			categories: studyCategories.value,
			videos: studyVideos.value,
		});
	} catch (err) {
		const cached = readLocalCache<CachedStudy>(CACHE_KEYS.study);
		if (cached) {
			studyCategories.value = cached.data.categories || studyCategories.value;
			studyVideos.value = cached.data.videos || [];
			cacheFallbacks.study = `学习接口失败，已显示 ${formatCacheTime(cached.savedAt)} 缓存`;
			studyError.value = `${friendlyError((err as Error).message)}，已显示最近缓存`;
		} else {
			studyError.value = friendlyError((err as Error).message);
		}
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
	aiMetaLoading.value = true;
	aiMetaError.value = "";
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
		cacheFallbacks.ai = "";
		writeLocalCache<CachedAiMeta>(CACHE_KEYS.ai, {
			models: aiModels.value,
			templates: templates.value,
		});
	} catch (err) {
		const cached = readLocalCache<CachedAiMeta>(CACHE_KEYS.ai);
		if (cached) {
			aiModels.value = cached.data.models || [];
			templates.value = cached.data.templates || [];
			const defaultModel = aiModels.value.find((item) => item.capability === "text" && item.isDefault) ||
				aiModels.value.find((item) => item.capability === "text");
			if (defaultModel && !selectedModelId.value) {
				selectedModelId.value = defaultModel.modelId;
				thinking.value = Boolean(defaultModel.thinkingDefault);
			}
			cacheFallbacks.ai = `AI 配置接口失败，已显示 ${formatCacheTime(cached.savedAt)} 缓存`;
			aiMetaError.value = `${friendlyError((err as Error).message)}，已显示最近缓存`;
		} else {
			aiMetaError.value = friendlyError((err as Error).message);
		}
	} finally {
		aiMetaLoading.value = false;
	}
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
	messageError.value = "";
	try {
		const data = (await request({
			url: `${config.baseUrl}/app/message/list?page=1&size=20`,
			method: "GET",
		})) as any;
		messages.value = data.list || [];
		await loadUnreadCount();
	} catch (err) {
		messageError.value = friendlyError((err as Error).message || "消息加载失败");
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
	aiMetaError.value = "";
	aiMetaLoading.value = false;
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

function mobileWebToolCount() {
	return tools.value.filter((item) => item.type !== "local_plugin" && normalizeToolUrl(item.entry)).length;
}

function toCacheableTools(list: ToolboxTool[]) {
	return list.map((item) => ({
		...item,
		isFavorite: false,
	}));
}

function writeLocalCache<T>(key: string, data: T) {
	try {
		uni.setStorageSync(key, {
			savedAt: Date.now(),
			data,
		} as CacheEntry<T>);
	} catch {}
}

function readLocalCache<T>(key: string) {
	try {
		const value = uni.getStorageSync(key) as CacheEntry<T>;
		if (value?.data && value.savedAt) return value;
	} catch {}
	return null;
}

function failureSummary() {
	return [error.value, studyError.value, aiMetaError.value, messageError.value, aiError.value]
		.filter(Boolean)
		.join("；");
}

function formatCheckTime(date: Date) {
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatCacheTime(timestamp: number) {
	const date = new Date(timestamp);
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
	padding: 32rpx 26rpx 72rpx;
	background:
		linear-gradient(rgba(25, 99, 164, 0.11) 1px, transparent 1px),
		linear-gradient(90deg, rgba(25, 99, 164, 0.1) 1px, transparent 1px),
		linear-gradient(150deg, rgba(34, 199, 255, 0.18), transparent 38%),
		linear-gradient(28deg, transparent 55%, rgba(255, 194, 87, 0.12)),
		#07131f;
	background-size: 58rpx 58rpx, 58rpx 58rpx, 100% 100%, 100% 100%;
	color: #eff8ff;
	box-sizing: border-box;
}

.hero,
.banner,
.panel {
	border: 1px solid rgba(118, 191, 220, 0.34);
	border-radius: 18rpx;
	background: linear-gradient(135deg, rgba(8, 32, 55, 0.96), rgba(11, 58, 75, 0.76));
	box-shadow: 0 20rpx 56rpx rgba(0, 0, 0, 0.22);
}

.hero {
	min-height: 210rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 24rpx;
	padding: 34rpx 30rpx;
	border-color: rgba(83, 224, 213, 0.42);
	background:
		linear-gradient(135deg, rgba(8, 33, 60, 0.98), rgba(16, 78, 88, 0.8)),
		linear-gradient(90deg, rgba(255, 203, 107, 0.14), transparent);
}

.eyebrow,
.desc,
.summary,
.study-card text:nth-child(3),
.template-card text:nth-child(3) {
	display: block;
	color: #a4bfd3;
	font-size: 24rpx;
	line-height: 1.55;
}

.title {
	display: block;
	margin: 12rpx 0;
	color: #f5fbff;
	font-size: 52rpx;
	font-weight: 900;
	line-height: 1.08;
}

.hero-actions {
	min-width: 138rpx;
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

button {
	min-height: 64rpx;
	color: #dff8ff;
	background: rgba(9, 45, 67, 0.82);
	border: 1px solid rgba(93, 227, 215, 0.42);
	border-radius: 14rpx;
	line-height: 1.35;
}

.dot {
	min-width: 28rpx;
	height: 28rpx;
	position: absolute;
	top: -10rpx;
	right: -10rpx;
	padding: 0 8rpx;
	border-radius: 999rpx;
	background: #22c55e;
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
	border: 1px solid rgba(104, 193, 218, 0.34);
	border-radius: 16rpx;
	background: rgba(7, 25, 41, 0.9);
	box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.04);
}

.search text {
	color: #57dfcf;
	font-size: 34rpx;
}

.search input,
.login-panel input {
	min-width: 0;
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
	justify-content: center;
	gap: 10rpx;
	min-height: 66rpx;
	margin-right: 16rpx;
	padding: 0 22rpx;
	border: 1px solid rgba(112, 170, 194, 0.3);
	border-radius: 16rpx;
	color: #b8c9d8;
	background: rgba(7, 25, 41, 0.78);
	font-size: 25rpx;
}

.tab.active,
.mode-chip.active,
.sort-row .active {
	color: #f8fffd;
	border-color: rgba(88, 236, 216, 0.78);
	background: linear-gradient(135deg, rgba(18, 111, 124, 0.92), rgba(17, 78, 99, 0.88));
	box-shadow: inset 4rpx 0 0 #ffc857;
}

.tab em {
	min-width: 30rpx;
	padding: 0 8rpx;
	border-radius: 999rpx;
	background: rgba(255, 200, 87, 0.18);
	color: #ffe1a1;
	text-align: center;
	font-style: normal;
	font-size: 22rpx;
}

.panel {
	margin: 20rpx 0;
	padding: 26rpx;
}

.panel-head,
.section-head,
.sort-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 18rpx;
	color: #f4fbff;
	font-size: 32rpx;
	font-weight: 800;
}

.login-panel {
	display: grid;
	gap: 18rpx;
}

.login-panel input {
	height: 82rpx;
	padding: 0 20rpx;
	border: 1px solid rgba(104, 193, 218, 0.34);
	border-radius: 16rpx;
	background: rgba(5, 22, 36, 0.88);
}

.primary-btn {
	height: 82rpx;
	border-radius: 16rpx;
	background: linear-gradient(135deg, #18a894, #17729b);
	font-weight: 800;
}

.primary-btn.ghost {
	background: rgba(6, 28, 44, 0.88);
}

.error-text,
.ai-error {
	color: #ffd2d2;
}

.ai-error {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding: 18rpx 20rpx;
	border: 1px solid rgba(255, 139, 139, 0.34);
	border-radius: 16rpx;
	background: rgba(86, 23, 34, 0.28);
}

.message-item {
	display: flex;
	justify-content: space-between;
	gap: 16rpx;
	padding: 18rpx 0;
	border-top: 1px solid rgba(118, 191, 220, 0.16);
	color: #9fb4c5;
	font-size: 24rpx;
}

.message-item text:first-child {
	flex: 1;
	min-width: 0;
	color: #dbefff;
}

.message-item.unread text:first-child::before {
	content: "";
	display: inline-block;
	width: 12rpx;
	height: 12rpx;
	margin-right: 10rpx;
	border-radius: 50%;
	background: #22c55e;
}

.banner {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	min-height: 160rpx;
	justify-content: center;
	padding: 30rpx;
	margin-bottom: 24rpx;
	border-color: rgba(255, 200, 87, 0.28);
}

.banner text:first-child {
	color: #ffdc8a;
	font-size: 38rpx;
	font-weight: 900;
}

.tool-list,
.study-list,
.message-list {
	display: grid;
	gap: 16rpx;
}

.loading-grid {
	display: grid;
	gap: 16rpx;
	margin: 18rpx 0;
}

.loading-list {
	display: grid;
	gap: 14rpx;
	padding: 4rpx 0 12rpx;
}

.loading-card,
.loading-row {
	position: relative;
	overflow: hidden;
	border: 1px solid rgba(103, 173, 199, 0.18);
	border-radius: 18rpx;
	background: rgba(8, 29, 45, 0.72);
}

.loading-card {
	height: 134rpx;
}

.loading-card.tall {
	height: 360rpx;
}

.loading-row {
	height: 64rpx;
	border-radius: 14rpx;
}

.loading-card::after,
.loading-row::after {
	content: "";
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	background: linear-gradient(90deg, transparent, rgba(88, 236, 216, 0.12), transparent);
	transform: translateX(-100%);
	animation: loading-sweep 1.35s ease-in-out infinite;
}

@keyframes loading-sweep {
	100% {
		transform: translateX(100%);
	}
}

.tool-card,
.study-card,
.template-card,
.ai-message {
	border: 1px solid rgba(103, 173, 199, 0.3);
	border-radius: 18rpx;
	background: rgba(8, 29, 45, 0.88);
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.18);
}

.tool-card {
	display: grid;
	grid-template-columns: 88rpx minmax(0, 1fr);
	gap: 20rpx;
	padding: 22rpx;
}

.icon {
	width: 88rpx;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(88, 236, 216, 0.54);
	border-radius: 16rpx;
	color: #dffaf5;
	font-size: 28rpx;
	font-weight: 900;
	background: linear-gradient(135deg, rgba(20, 122, 133, 0.72), rgba(28, 58, 88, 0.76));
}

.name-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
	min-width: 0;
}

.name {
	flex: 1;
	min-width: 0;
	color: #f2fbff;
	font-size: 30rpx;
	font-weight: 800;
	line-height: 1.25;
}

.badge,
.tags text,
.study-card text:first-child,
.template-card text:first-child {
	display: inline-flex;
	margin: 8rpx 8rpx 0 0;
	padding: 4rpx 12rpx;
	border: 1px solid rgba(88, 236, 216, 0.42);
	border-radius: 8rpx;
	color: #79f3df;
	font-size: 22rpx;
}

.badge.muted {
	color: #ffd98b;
	border-color: rgba(255, 217, 120, 0.42);
}

.favorite {
	min-width: 48rpx;
	text-align: center;
	color: #6f8292;
	font-size: 34rpx;
}

.favorite.active {
	color: #ffc857;
}

.empty,
.error {
	padding: 28rpx;
	border: 1px solid rgba(255, 120, 120, 0.38);
	border-radius: 16rpx;
	color: #ffd2d2;
	background: rgba(80, 20, 36, 0.28);
}

.empty-state {
	display: grid;
	gap: 12rpx;
	margin: 18rpx 0;
	padding: 28rpx;
	border: 1px solid rgba(118, 191, 220, 0.24);
	border-radius: 18rpx;
	background: rgba(7, 25, 41, 0.72);
	color: #9fb4c5;
}

.empty-state text:first-child {
	color: #f2fbff;
	font-size: 30rpx;
	font-weight: 800;
}

.empty-state text:nth-child(2) {
	font-size: 25rpx;
	line-height: 1.55;
}

.empty-state button {
	justify-self: start;
	min-width: 150rpx;
	margin: 8rpx 0 0;
	padding: 0 24rpx;
	border-color: rgba(88, 236, 216, 0.48);
	color: #e8fffb;
	background: rgba(18, 111, 124, 0.62);
}

.empty-state.compact {
	margin: 12rpx 0 0;
	padding: 22rpx;
}

.empty-state.warning {
	border-color: rgba(255, 200, 87, 0.34);
	background: rgba(66, 50, 28, 0.34);
}

.cache-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	margin: -10rpx 0 24rpx;
	padding: 18rpx 20rpx;
	border: 1px solid rgba(255, 200, 87, 0.32);
	border-radius: 16rpx;
	background: rgba(66, 50, 28, 0.36);
	color: #ffe4a8;
	font-size: 24rpx;
	line-height: 1.45;
}

.cache-banner text {
	flex: 1;
	min-width: 0;
}

.self-check-head {
	margin-top: 30rpx;
}

.self-check-actions {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.check-summary {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12rpx;
	margin-bottom: 16rpx;
}

.check-summary > view {
	min-height: 86rpx;
	display: grid;
	align-content: center;
	gap: 4rpx;
	padding: 14rpx 16rpx;
	border: 1px solid rgba(103, 173, 199, 0.2);
	border-radius: 16rpx;
	background: rgba(7, 25, 41, 0.62);
}

.check-summary text:first-child {
	color: #9fb4c5;
	font-size: 22rpx;
}

.check-summary text:last-child {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #f2fbff;
	font-size: 25rpx;
	font-weight: 800;
}

.check-list {
	display: grid;
	gap: 14rpx;
}

.check-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	min-height: 112rpx;
	padding: 20rpx;
	border: 1px solid rgba(103, 173, 199, 0.24);
	border-radius: 16rpx;
	background: rgba(8, 29, 45, 0.78);
}

.check-item:active {
	border-color: rgba(88, 236, 216, 0.52);
	background: rgba(12, 45, 62, 0.88);
}

.check-item > view {
	display: grid;
	gap: 6rpx;
	min-width: 0;
}

.check-item > view text:first-child {
	color: #f2fbff;
	font-size: 28rpx;
	font-weight: 800;
}

.check-item > view text:last-child {
	color: #9fb4c5;
	font-size: 23rpx;
	line-height: 1.45;
}

.check-status {
	flex-shrink: 0;
	min-width: 100rpx;
	padding: 8rpx 12rpx;
	border-radius: 999rpx;
	text-align: center;
	font-size: 22rpx;
}

.check-item.ok .check-status {
	color: #b9fff2;
	background: rgba(24, 168, 148, 0.24);
}

.check-item.warn .check-status {
	color: #ffe0a3;
	background: rgba(255, 200, 87, 0.2);
}

.check-item.todo .check-status {
	color: #c2d2df;
	background: rgba(159, 180, 197, 0.14);
}

.empty.small {
	color: #9fb4c5;
	border-color: rgba(118, 191, 220, 0.18);
	background: transparent;
}

.study-card {
	overflow: hidden;
}

.cover {
	height: 260rpx;
	background: linear-gradient(135deg, rgba(8, 42, 58, 0.9), rgba(44, 46, 36, 0.72));
	display: flex;
	align-items: center;
	justify-content: center;
	color: #ffdc8a;
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
	line-height: 1.32;
}

.ai-head {
	display: grid;
	gap: 18rpx;
	padding: 10rpx 0 24rpx;
}

.ai-title {
	display: block;
	margin-top: 8rpx;
	color: #f2fbff;
	font-size: 40rpx;
	font-weight: 900;
	line-height: 1.18;
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
	color: #bfd2df;
	font-size: 24rpx;
}

.template-scroll {
	white-space: nowrap;
	margin-bottom: 22rpx;
}

.template-card {
	display: inline-grid;
	gap: 8rpx;
	width: 430rpx;
	min-height: 160rpx;
	margin-right: 18rpx;
	padding: 22rpx;
	box-sizing: border-box;
	vertical-align: top;
}

.template-card text:nth-child(2) {
	color: #f2fbff;
	font-size: 30rpx;
	font-weight: 800;
	line-height: 1.3;
}

.ai-message {
	padding: 22rpx;
	color: #dfefff;
	line-height: 1.7;
}

.ai-message.user {
	margin-left: 72rpx;
	border-color: rgba(255, 200, 87, 0.32);
	background: rgba(66, 58, 37, 0.52);
}

.ai-message.assistant {
	margin-right: 40rpx;
	border-color: rgba(88, 236, 216, 0.28);
}

.reasoning {
	display: block;
	margin-bottom: 12rpx;
	color: #85d9cf;
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
	bottom: 20rpx;
	margin-top: 26rpx;
	padding: 20rpx;
	border: 1px solid rgba(167, 190, 198, 0.34);
	border-radius: 24rpx;
	background: rgba(13, 20, 28, 0.96);
	box-shadow: 0 -12rpx 42rpx rgba(0, 0, 0, 0.28);
}

.composer textarea {
	width: 100%;
	min-height: 92rpx;
	color: #eef8ff;
	line-height: 1.6;
	font-size: 28rpx;
}

.mode-row {
	white-space: nowrap;
	margin: 14rpx 0;
}

.send-btn {
	width: 100%;
	height: 78rpx;
	border-radius: 999rpx;
	border: 0;
	background: linear-gradient(135deg, #f8d982, #56e0d0);
	color: #07131f;
	font-weight: 800;
}
</style>
