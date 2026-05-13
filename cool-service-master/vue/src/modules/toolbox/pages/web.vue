<template>
	<main class="web-toolbox">
		<aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
			<div class="brand">
				<span class="brand-logo">数</span>
				<strong v-if="!sidebarCollapsed">数智工具箱</strong>
				<button type="button" @click="sidebarCollapsed = !sidebarCollapsed">
					{{ sidebarCollapsed ? '›' : '‹' }}
				</button>
			</div>

			<nav class="nav-list">
				<button
					v-for="item in navItems"
					:key="item.code"
					type="button"
					:class="{ active: activeView === item.code }"
					@click="switchView(item.code)"
				>
						<span class="nav-icon">{{ iconGlyph(item.icon, item.name) }}</span>
					<span v-if="!sidebarCollapsed" class="nav-name">{{ item.name }}</span>
					<em v-if="!sidebarCollapsed">{{ item.count }}</em>
				</button>
			</nav>

			<div v-if="!sidebarCollapsed" class="usage-card">
				<span>今日使用</span>
				<strong>{{ usageStats.todayCount || 0 }}</strong>
				<small>累计 {{ usageStats.totalCount || 0 }} 次</small>
			</div>
		</aside>

		<section class="workspace" :class="{ running: Boolean(activeToolUrl) }">
			<header class="topbar">
				<label class="search">
					<span>⌕</span>
					<input v-model="keyword" :placeholder="searchPlaceholder" @keyup.enter="submitSearch" />
				</label>
				<div class="top-actions">
					<button type="button" @click="refreshCurrent">刷新</button>
					<button type="button" class="notice-btn" @click="toggleMessages">
						通知
						<b v-if="unreadCount">{{ unreadCount }}</b>
					</button>
					<button type="button" class="user-btn" @click="currentUser ? showProfile = true : showLogin = true">
						<span>{{ currentUser?.nickName?.slice(0, 1) || '登' }}</span>
						{{ currentUser?.nickName || '登录' }}
					</button>
				</div>
			</header>

			<nav class="mobile-nav">
				<button
					v-for="item in navItems"
					:key="item.code"
					type="button"
					:class="{ active: activeView === item.code }"
					@click="switchView(item.code)"
				>
					<span>{{ iconGlyph(item.icon, item.name) }}</span>
					{{ item.name }}
					<em>{{ item.count }}</em>
				</button>
			</nav>

			<section v-if="activeToolUrl" class="web-runner">
				<div class="runner-bar">
					<span class="runner-title">{{ activeTool?.name }}</span>
					<button type="button" @click="goIframeBack">返回</button>
					<button type="button" @click="reloadIframe">刷新</button>
					<button type="button" @click="activeToolUrl = activeToolHomeUrl">返回首页</button>
					<input :value="activeToolUrl" readonly />
					<a :href="activeToolUrl" target="_blank" rel="noreferrer">新标签打开</a>
					<button type="button" class="danger" @click="closeRunner">关闭</button>
				</div>
				<div class="iframe-stage">
					<iframe ref="iframeRef" :src="activeToolUrl" sandbox="allow-forms allow-scripts allow-same-origin allow-popups" />
					<p class="iframe-tip">如果网页因安全策略无法显示，请点击“新标签打开”。</p>
				</div>
			</section>

			<section v-else-if="activeView === 'ai'" class="ai-workspace">
				<div class="ai-shell">
					<aside class="ai-history">
						<div>
							<strong>开启创作</strong>
							<button type="button" @click="newConversation">+</button>
						</div>
						<button type="button" class="history-action" @click="newConversation">新对话</button>
						<p>最近</p>
						<button
							v-for="item in conversations"
							:key="item.id"
							type="button"
							:class="{ active: activeConversation?.id === item.id }"
							@click="loadConversation(item.id)"
						>
							<span>{{ truncate(item.title, 14) }}</span>
							<small>{{ item.modelId }}</small>
						</button>
					</aside>

					<section class="ai-main">
						<div class="ai-head">
							<div>
								<span>AGENT WORKSPACE</span>
								<h1>{{ aiTitle }}</h1>
								<p>{{ aiSubtitle }}</p>
								</div>
								<div class="model-controls">
									<select v-model="selectedModelId" :disabled="!modeModels.length">
										<option v-if="!modeModels.length" value="">
											{{ currentUser ? `暂无${modeModelLabel}模型` : `登录后选择${modeModelLabel}模型` }}
										</option>
										<option v-for="model in modeModels" :key="model.modelId" :value="model.modelId">
											{{ model.name }}
										</option>
									</select>
									<label>
										<input v-model="thinking" type="checkbox" />
										Thinking
									</label>
								</div>
							</div>

							<div v-if="!currentUser" class="ai-empty">
								<span>AGENT WORKSPACE</span>
								<strong>登录后同步桌面端智能会话</strong>
								<p>模型、模板、历史会话和图片/音频/视频生成记录会与桌面端共用同一套账号数据。</p>
								<button type="button" @click="showLogin = true">登录同步</button>
							</div>

							<div v-else class="message-list" ref="messageListRef">
								<div class="template-grid" v-if="!messages.length">
									<button v-for="item in templates" :key="item.id" type="button" @click="useTemplate(item)">
										<span>{{ item.tags?.[0] || '精选' }}</span>
										<strong>{{ item.title }}</strong>
										<small>{{ item.description }}</small>
									</button>
								</div>

								<div v-for="item in messages" :key="item.localId || item.id" class="message" :class="item.role">
									<details v-if="item.reasoningContent" class="reasoning">
										<summary>查看思考过程</summary>
										<p>{{ item.reasoningContent }}</p>
									</details>
									<p v-if="displayMessageContent(item)">{{ displayMessageContent(item) }}</p>
									<div v-if="messageOutputUrls(item).length" class="outputs">
										<template v-for="url in messageOutputUrls(item)" :key="url">
											<div v-if="isImageOutput(url, item)" class="image-output">
												<a :href="url" target="_blank" rel="noreferrer" title="查看原图">
													<img :src="url" alt="AI 生成图片" />
												</a>
												<div>
													<span>图片预览</span>
													<a :href="url" :download="imageFileName(url)" target="_blank" rel="noreferrer">下载图片</a>
												</div>
											</div>
											<audio v-else-if="isAudio(url)" :src="url" controls />
											<video v-else-if="isVideo(url)" :src="url" controls />
											<a v-else-if="!isImageOutput(url, item)" :href="url" target="_blank" rel="noreferrer">{{ url }}</a>
										</template>
									</div>
									<button v-if="item.role === 'assistant' && item.content" type="button" @click="copyText(item.content)">复制</button>
								</div>
							<div v-if="aiError" class="ai-error">
								{{ aiError }}
								<button type="button" @click="sendAi">重试</button>
							</div>
						</div>

							<div v-if="currentUser" class="composer">
								<textarea v-model="aiInput" :placeholder="composerPlaceholder" @keydown.enter.meta.prevent="sendAi" />
								<div class="mode-actions">
									<button
										v-for="item in generationTypes"
										:key="item.type"
										type="button"
										class="mode-btn"
										:class="{ active: aiMode === item.type }"
										@click="aiMode = item.type"
									>
									{{ item.label }}
								</button>
								<button type="button" class="send" :disabled="isAiSending || !aiInput.trim()" @click="sendAi">
									{{ isAiSending ? '生成中' : '发送' }}
								</button>
							</div>
						</div>
					</section>
				</div>
			</section>

				<section v-else-if="activeView === 'study'" class="study-page">
					<section class="category-banner study-banner">
						<div>
							<h1>学习中心</h1>
							<h2>知识持续进阶</h2>
							<p>精选技术视频、实战教程与架构指南</p>
						</div>
					</section>

					<div class="study-overview">
						<div>
							<span>当前课程</span>
							<strong>{{ studyVideos.length }}</strong>
							<small>{{ studyCategoryName(activeStudyCategory) }}</small>
						</div>
						<div>
							<span>培训分类</span>
							<strong>{{ Math.max(studyCategories.length - 1, 0) }}</strong>
							<small>后台同步分类</small>
						</div>
						<div>
							<span>展示方式</span>
							<strong>{{ studySort === 'recommend' ? '推荐' : '热门' }}</strong>
							<small>支持搜索筛选</small>
						</div>
					</div>

					<div class="filter-bar study-filter">
						<div class="category-tabs">
							<button
								v-for="item in studyCategories"
								:key="item.code"
								type="button"
								:class="{ active: activeStudyCategory === item.code }"
								@click="selectStudyCategory(item.code)"
							>
								{{ item.name }}
							</button>
						</div>
						<div>
							<button type="button" :class="{ active: studySort === 'recommend' }" @click="studySort = 'recommend'; loadStudyVideos()">推荐</button>
							<button type="button" :class="{ active: studySort === 'hot' }" @click="studySort = 'hot'; loadStudyVideos()">热门</button>
						</div>
					</div>
					<div class="study-grid">
						<article v-for="item in studyVideos" :key="item.id" class="study-card" @click="openStudy(item)">
							<div class="cover">
								<img v-if="item.coverUrl" :src="normalizeAsset(item.coverUrl)" alt="" />
								<span v-else>▶</span>
								<em>{{ item.duration || '课程' }}</em>
							</div>
							<div>
								<span>{{ studyCategoryName(item.category) }}</span>
								<h3>{{ item.title }}</h3>
								<p>{{ item.description || '暂无简介' }}</p>
								<small>{{ item.author || '数智工具箱' }} · {{ item.duration || '视频课程' }}</small>
								<button type="button" @click.stop="openStudy(item)">开始学习</button>
							</div>
						</article>
					</div>
					<p v-if="loadingStudy" class="empty">课程加载中...</p>
					<p v-else-if="!studyVideos.length" class="empty">暂无匹配培训内容，请调整分类或搜索关键词。</p>
				</section>

			<section v-else class="tool-page">
				<section v-if="activeView === 'all'" class="home-banner">
					<div>
						<h1>欢迎使用 数智工具箱</h1>
						<p>一站式工具集合，让工作、学习和创作更轻松。</p>
					</div>
					<div class="banner-cube"><span /><span /><span /></div>
				</section>

				<section v-else class="category-banner">
					<div>
						<h1>{{ currentCategory?.name || '工具' }}</h1>
						<h2>{{ categoryHeadline }}</h2>
						<p>{{ categorySubtitle }}</p>
					</div>
				</section>

					<section v-if="activeView === 'all'" class="favorites">
						<div class="section-title">
							<h2>我的收藏</h2>
							<button v-if="favoriteTools.length" type="button" @click="activeView = 'favorite'">查看全部 ›</button>
						</div>
						<div v-if="favoriteTools.length" class="mini-grid">
							<article v-for="tool in favoriteTools.slice(0, 5)" :key="tool.id" @click="openTool(tool)">
								<span :class="['mini-icon', toolIconTone(tool)]">{{ iconGlyph(tool.icon, tool.name) }}</span>
								<strong>{{ tool.name }}</strong>
								<button type="button" @click.stop="toggleFavorite(tool)">★</button>
							</article>
						</div>
						<div v-else class="favorite-empty">
							<strong>{{ currentUser ? '还没有收藏应用' : '还没有收藏应用' }}</strong>
							<span>{{ currentUser ? '点击应用卡片右上角星标，将常用应用放到这里。' : '未登录也可先收藏到本机，登录后会继续同步常用应用。' }}</span>
							<button v-if="!currentUser" type="button" @click="showLogin = true">登录同步</button>
						</div>
					</section>

				<div v-if="tagFilters.length" class="filter-bar">
					<button type="button" :class="{ active: !activeTag }" @click="activeTag = ''">全部</button>
					<button v-for="tag in tagFilters" :key="tag" type="button" :class="{ active: activeTag === tag }" @click="activeTag = tag">
						{{ tag }}
					</button>
				</div>

				<div class="section-title">
					<h2>{{ activeView === 'favorite' ? '全部收藏' : '推荐工具' }}</h2>
					<div>
						<button type="button" :class="{ active: toolSort === 'new' }" @click="toolSort = 'new'">最新</button>
						<button type="button" :class="{ active: toolSort === 'hot' }" @click="toolSort = 'hot'">最热</button>
						<button type="button" :class="{ active: toolSort === 'favorite' }" @click="toolSort = 'favorite'">收藏</button>
					</div>
				</div>

					<div class="tool-grid">
						<article v-for="tool in visibleTools" :key="tool.id" class="tool-card" @click="openTool(tool)">
							<button type="button" class="fav" :class="{ active: favoriteIds.has(tool.id) }" @click.stop="toggleFavorite(tool)">
								{{ favoriteIds.has(tool.id) ? '★' : '☆' }}
							</button>
							<div :class="['tool-icon', toolIconTone(tool)]">
								<img v-if="isIconImage(tool.icon)" :src="normalizeAsset(tool.icon)" alt="" />
								<span v-else>{{ iconGlyph(tool.icon, tool.name) }}</span>
							</div>
							<div>
								<h3>{{ tool.name }}</h3>
								<p>{{ tool.description || '暂无简介' }}</p>
								<div class="tool-meta">
									<span v-if="tool.authRequired" class="tag tag-locked">需登录</span>
									<span v-if="tool.type === 'local_plugin'" class="tag tag-desktop">仅桌面</span>
									<span v-else-if="tool.type === 'external_link'" class="tag tag-link">外链</span>
									<span v-else class="tag tag-web">内置</span>
									<span v-for="tag in tool.tags" :key="tag" class="tag">{{ tag }}</span>
								</div>
							</div>
						</article>
					</div>
					<p v-if="homeError" class="empty error">{{ homeError }}</p>
					<p v-else-if="!visibleTools.length && !loadingHome" class="empty">暂无匹配工具</p>
				</section>
		</section>

		<div v-if="showMessages" class="drawer-mask" @click.self="showMessages = false">
			<aside class="drawer">
				<div class="drawer-head">
					<h2>消息通知</h2>
					<button type="button" @click="showMessages = false">关闭</button>
				</div>
				<button v-for="item in messagesPanel" :key="item.id" type="button" class="message-row" @click="readMessage(item)">
					<strong>{{ item.title }}</strong>
					<small>{{ item.createTime || item.publishTime }}</small>
					<p>{{ item.content || '点击查看详情' }}</p>
				</button>
				<p v-if="!messagesPanel.length" class="empty">暂无消息</p>
			</aside>
		</div>

		<div v-if="activeStudyVideo" class="drawer-mask" @click.self="activeStudyVideo = null">
			<section class="detail-modal">
				<button type="button" @click="activeStudyVideo = null">关闭</button>
				<img v-if="activeStudyVideo.coverUrl" :src="normalizeAsset(activeStudyVideo.coverUrl)" alt="" />
				<h2>{{ activeStudyVideo.title }}</h2>
				<p>{{ activeStudyVideo.description || activeStudyVideo.remark || '暂无简介' }}</p>
				<video v-if="activeStudyVideo.videoUrl" :src="normalizeAsset(activeStudyVideo.videoUrl)" controls />
				<a v-if="activeStudyVideo.videoUrl" :href="normalizeAsset(activeStudyVideo.videoUrl)" target="_blank" rel="noreferrer">打开学习地址</a>
			</section>
		</div>

		<div v-if="showLogin" class="drawer-mask" @click.self="showLogin = false">
			<form class="login-modal" @submit.prevent="login">
				<h2>登录数智工具箱</h2>
				<input v-model="loginForm.phone" placeholder="手机号" />
				<input v-model="loginForm.password" placeholder="密码" type="password" />
				<p v-if="loginError">{{ loginError }}</p>
				<button type="submit" :disabled="isLoggingIn">{{ isLoggingIn ? '登录中' : '登录' }}</button>
			</form>
		</div>

		<div v-if="showProfile" class="drawer-mask" @click.self="showProfile = false">
			<section class="login-modal">
				<h2>我的账号</h2>
				<p>{{ currentUser?.nickName || currentUser?.phone || '已登录用户' }}</p>
				<button type="button" @click="logout">退出登录</button>
			</section>
		</div>
	</main>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';

defineOptions({ name: 'toolbox-web-portal' });

type ToolType = 'external_link' | 'internal_web' | 'local_plugin';
type AiMode = 'text' | 'image' | 'audio_music' | 'audio_speech' | 'video';

interface ApiEnvelope<T> {
	code?: number;
	message?: string;
	data?: T;
}

interface UserInfo {
	id?: number;
	phone?: string;
	nickName?: string;
	avatarUrl?: string;
}

interface Session {
	token?: string;
	refreshToken?: string;
	user?: UserInfo;
}

interface Category {
	id: number;
	name: string;
	code: string;
	icon?: string;
	sort?: number;
}

interface Tool {
	id: number;
	categoryId?: number;
	name: string;
	code: string;
	description?: string;
	icon?: string;
	type: ToolType;
	entry: string;
	openMode?: string;
	tags?: string[];
	keywords?: string;
	authRequired?: number | boolean;
	isFavorite?: boolean;
	isHot?: number | boolean;
	isNew?: number | boolean;
	sort?: number;
}

interface Message {
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
	remark?: string;
}

interface AiModel {
	id: number;
	provider: string;
	capability: AiMode;
	modelId: string;
	name: string;
	description?: string;
	isDefault?: number;
	thinkingDefault?: number;
	sort?: number;
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
	thinking?: number;
	mode?: string;
}

interface AiMessage {
	id?: number;
	localId?: string;
	role: 'user' | 'assistant';
	content?: string;
	reasoningContent?: string;
	outputUrls?: string[];
}

const API_BASE = import.meta.env.DEV ? '/dev' : '/api';
const SESSION_KEY = 'brmtool.web.session.v1';
const FAVORITE_KEY_PREFIX = 'brmtool.web.favorites.v1';
const initialSession = readSession();

const defaultCategories: Category[] = [
	{ id: 0, name: '首页', code: 'all', icon: '首' },
	{ id: 103, name: '导航', code: 'nav', icon: '航' },
	{ id: 102, name: '工具', code: 'tool', icon: '工' },
	{ id: 104, name: '智能', code: 'ai', icon: '智' },
	{ id: 105, name: '学习', code: 'study', icon: '学' }
];

const sidebarCollapsed = ref(false);
const activeView = ref('all');
const keyword = ref('');
const activeTag = ref('');
const toolSort = ref<'new' | 'hot' | 'favorite'>('new');
const categories = ref<Category[]>(defaultCategories);
const tools = ref<Tool[]>([]);
const favoriteIds = ref(readFavoriteIds(initialSession.user || null));
const usageStats = ref({ todayCount: 0, totalCount: 0 });
const loadingHome = ref(false);
const homeError = ref('');
const currentUser = ref<UserInfo | null>(initialSession.user || null);
const showLogin = ref(false);
const isLoggingIn = ref(false);
const loginError = ref('');
const loginForm = reactive({ phone: '', password: '' });
const showProfile = ref(false);
const showMessages = ref(false);
const unreadCount = ref(0);
const messagesPanel = ref<Message[]>([]);
const activeTool = ref<Tool | null>(null);
const activeToolUrl = ref('');
const activeToolHomeUrl = ref('');
const iframeRef = ref<HTMLIFrameElement | null>(null);
const studyCategories = ref<StudyCategory[]>([{ id: 0, name: '全部内容', code: 'all' }]);
const activeStudyCategory = ref('all');
const studySort = ref<'recommend' | 'hot'>('recommend');
const studyVideos = ref<StudyVideo[]>([]);
const loadingStudy = ref(false);
const activeStudyVideo = ref<StudyVideo | null>(null);
const aiModels = ref<AiModel[]>([]);
const templates = ref<AiTemplate[]>([]);
const conversations = ref<AiConversation[]>([]);
const activeConversation = ref<AiConversation | null>(null);
const messages = ref<AiMessage[]>([]);
const selectedModelId = ref('');
const thinking = ref(true);
const aiMode = ref<AiMode>('text');
const aiInput = ref('');
const isAiSending = ref(false);
const aiError = ref('');
const messageListRef = ref<HTMLElement | null>(null);

const generationTypes = [
	{ type: 'text' as const, label: 'Agent 模式' },
	{ type: 'image' as const, label: '图片生成' },
	{ type: 'audio_music' as const, label: '音乐生成' },
	{ type: 'audio_speech' as const, label: '语音生成' },
	{ type: 'video' as const, label: '视频生成' }
];

const iconGlyphMap: Record<string, string> = {
	'icon-home': '首',
	'icon-menu': '航',
	'icon-goods': '工',
	'icon-app': '智',
	'icon-log': '学',
	home: '首',
	menu: '航',
	goods: '工',
	app: '智',
	log: '学',
	clock: '时',
	markdown: 'MD',
	'file-text': '文',
	link: '链',
	braces: '{}',
	base64: 'B64',
	'book-open': '文',
	msg: '言',
	feedback: '言'
};

const categoryMap = computed(() => new Map(categories.value.map(item => [item.id, item])));
const currentCategory = computed(() => categories.value.find(item => item.code === activeView.value));
const navItems = computed(() =>
	categories.value.map(item => ({
		...item,
		count:
			item.code === 'all'
				? tools.value.length
				: item.code === 'ai'
					? aiModels.value.length
					: item.code === 'study'
						? studyVideos.value.length
						: tools.value.filter(tool => categoryMap.value.get(tool.categoryId || 0)?.code === item.code).length
	}))
);
const favoriteTools = computed(() => tools.value.filter(tool => favoriteIds.value.has(tool.id)).sort(compareSort));
const tagFilters = computed(() => {
	if (!['nav', 'tool'].includes(activeView.value)) return [];
	const set = new Set<string>();
	tools.value.forEach(tool => {
		if (categoryMap.value.get(tool.categoryId || 0)?.code === activeView.value) {
			(tool.tags || []).forEach(tag => set.add(tag));
		}
	});
	return Array.from(set).slice(0, 10);
});
const visibleTools = computed(() => {
	const key = keyword.value.trim().toLowerCase();
	const base = tools.value.filter(tool => {
		const categoryCode = categoryMap.value.get(tool.categoryId || 0)?.code;
		const matchCategory =
			activeView.value === 'all' ||
			activeView.value === 'favorite' ||
			categoryCode === activeView.value;
		const matchFavorite = activeView.value !== 'favorite' || favoriteIds.value.has(tool.id);
		const matchTag = !activeTag.value || (tool.tags || []).includes(activeTag.value);
		const searchable = [tool.name, tool.description, tool.keywords, ...(tool.tags || [])]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return matchCategory && matchFavorite && matchTag && (!key || searchable.includes(key));
	});
	if (toolSort.value === 'favorite') return base.filter(tool => favoriteIds.value.has(tool.id)).sort(compareSort);
	if (toolSort.value === 'hot') {
		return [...base].sort((a, b) => Number(Boolean(b.isHot)) - Number(Boolean(a.isHot)) || compareSort(a, b));
	}
	return [...base].sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || compareSort(a, b));
});
const textModels = computed(() => aiModels.value.filter(item => item.capability === 'text'));
const modeModels = computed(() => aiModels.value.filter(item => item.capability === aiMode.value));
const modeModelLabel = computed(() => {
	const map: Record<AiMode, string> = {
		text: '文本',
		image: '图片',
		audio_music: '音乐',
		audio_speech: '语音',
		video: '视频'
	};
	return map[aiMode.value];
});
const selectedModel = computed(() => aiModels.value.find(item => item.modelId === selectedModelId.value));
const aiTitle = computed(() => activeConversation.value?.title || '今天想创作什么？');
const aiSubtitle = computed(() => {
	if (!currentUser.value) return '登录后同步桌面端会话、模板和生成记录';
	if (activeConversation.value) return '已同步桌面端智能会话';
	return '选择模板或直接输入任务开始创作';
});
const composerPlaceholder = computed(() => {
	if (aiMode.value === 'image') return '描述你想生成的图片，默认 1920x1920...';
	if (aiMode.value === 'audio_music') return '描述音乐风格、节奏、情绪和用途...';
	if (aiMode.value === 'audio_speech') return '输入要合成的语音文案...';
	if (aiMode.value === 'video') return '描述视频画面、镜头、运动和时长...';
	return '输入想法、脚本或任务，支持 Agent 一起创作...';
});
const searchPlaceholder = computed(() =>
	activeView.value === 'ai'
		? '搜索 AI 助手、智能体、工作流模板...'
		: activeView.value === 'study'
			? '搜索视频教程、实战课程、架构指南...'
			: '搜索你需要的工具，支持拼音 / 首字母快速搜索'
);
const categoryHeadline = computed(() => (activeView.value === 'nav' ? '常用网站，一键直达' : '效率工具，即开即用'));
const categorySubtitle = computed(() =>
	activeView.value === 'nav' ? '精选高效资源，快速打开常用站点' : '聚合常用效率工具，支持收藏与快速调用'
);

watch(aiMode, syncSelectedModelForMode);

onMounted(async () => {
	await restoreSessionUser();
	await Promise.allSettled([
		loadHome(),
		loadStudyMeta(),
		loadAiMeta(),
		currentUser.value ? loadConversations(true) : Promise.resolve()
	]);
	if (currentUser.value) {
		await loadUnreadCount();
	}
});

function switchView(code: string) {
	activeView.value = code;
	activeTag.value = '';
	if (code === 'study') loadStudyVideos();
	if (code === 'ai') ensureAiReady();
}

async function refreshAll() {
	await Promise.allSettled([
		loadHome(),
		loadStudyMeta(),
		loadAiMeta(),
		currentUser.value ? loadUnreadCount() : Promise.resolve()
	]);
}

async function refreshCurrent() {
	if (activeView.value === 'study') {
		await Promise.allSettled([loadStudyMeta(), loadStudyVideos()]);
		return;
	}
	if (activeView.value === 'ai') {
		await Promise.allSettled([loadAiMeta(), currentUser.value ? loadConversations() : Promise.resolve()]);
		return;
	}
	await refreshAll();
}

async function reloadTools() {
	await loadHome();
}

async function submitSearch() {
	if (activeView.value === 'study') {
		await loadStudyVideos();
		return;
	}
	await reloadTools();
}

async function loadHome() {
	loadingHome.value = true;
	homeError.value = '';
	try {
		const withAuth = Boolean(currentUser.value);
		const [data, toolsPage] = await Promise.all([
			apiRequest<any>('/app/toolbox/home', 'GET', undefined, withAuth).catch(() => ({})),
			apiRequest<{ list: Tool[] }>('/app/toolbox/tools?page=1&size=100', 'GET', undefined, withAuth).catch(() => ({ list: [] }))
		]);
		categories.value = normalizeCategories(data.categories || []);
		const map = new Map<string, Tool>();
		(toolsPage.list || []).forEach((tool: Tool) => {
			map.set(tool.code || String(tool.id), normalizeTool(tool));
		});
		['recommendTools', 'newTools', 'hotTools', 'favoriteTools', 'recentTools'].forEach(key => {
			(data[key] || []).forEach((tool: Tool) => {
				map.set(tool.code || String(tool.id), normalizeTool(tool));
			});
		});
		if (map.size === 0) {
			homeError.value = '应用接口暂时不可用，请确认后端服务已启动后点击刷新。';
		}
		const cachedFavoriteIds = currentUser.value ? new Set<number>() : readFavoriteIds();
		tools.value = Array.from(map.values())
			.map(tool => ({
				...tool,
				isFavorite: Boolean(tool.isFavorite) || cachedFavoriteIds.has(tool.id)
			}))
			.sort(compareSort);
		usageStats.value = data.usageStats || { todayCount: 0, totalCount: 0 };
		favoriteIds.value = new Set(tools.value.filter(tool => tool.isFavorite).map(tool => tool.id));
		writeFavoriteIds(favoriteIds.value);
	} finally {
		loadingHome.value = false;
	}
}

function normalizeCategories(list: Category[]) {
	const merged = new Map<string, Category>();
	[...defaultCategories, ...list].forEach(item => {
		merged.set(item.code, { ...item, icon: item.icon || item.name.slice(0, 1) });
	});
	return Array.from(merged.values()).sort((a, b) => {
		return Number(a.sort ?? 0) - Number(b.sort ?? 0) || Number(a.id || 0) - Number(b.id || 0);
	});
}

function normalizeTool(tool: Tool): Tool {
	return {
		...tool,
		icon: tool.icon || tool.name.slice(0, 1),
		tags: Array.isArray(tool.tags) ? tool.tags : []
	};
}

async function openTool(tool: Tool) {
	if (tool.authRequired && !currentUser.value) {
		showLogin.value = true;
		return;
	}
	if (tool.type === 'local_plugin') {
		alert('该插件仅支持桌面端，请在数智工具箱桌面客户端中打开。');
		return;
	}
	const url = normalizeToolUrl(tool.entry);
	if (!url) {
		alert('该工具暂未配置可访问地址。');
		return;
	}
	activeTool.value = tool;
	activeToolUrl.value = url;
	activeToolHomeUrl.value = url;
	await apiRequest('/app/toolbox/usage', 'POST', { toolId: tool.id, clientType: 'pc-web' }, false).catch(() => null);
}

function normalizeToolUrl(entry: string) {
	if (!entry) return '';
	if (/^https?:\/\//i.test(entry)) return entry;
	if (entry.startsWith('/')) return `${location.origin}${entry}`;
	return '';
}

function closeRunner() {
	activeTool.value = null;
	activeToolUrl.value = '';
	activeToolHomeUrl.value = '';
}

function reloadIframe() {
	iframeRef.value?.contentWindow?.location.reload();
}

function goIframeBack() {
	try {
		iframeRef.value?.contentWindow?.history.back();
	} catch {
		alert('当前网页不允许站内返回。');
	}
}

async function toggleFavorite(tool: Tool) {
	const previous = new Set(favoriteIds.value);
	const optimistic = new Set(previous);
	optimistic.has(tool.id) ? optimistic.delete(tool.id) : optimistic.add(tool.id);
	favoriteIds.value = optimistic;
	writeFavoriteIds(optimistic);
	tools.value = tools.value.map(item => (item.id === tool.id ? { ...item, isFavorite: optimistic.has(tool.id) } : item));

	if (!currentUser.value) {
		return;
	}

	try {
		const data = await apiRequest<{ favorited: boolean }>('/app/toolbox/favorite', 'POST', {
			toolId: tool.id,
			favorited: optimistic.has(tool.id)
		});
		const next = new Set(favoriteIds.value);
		data.favorited ? next.add(tool.id) : next.delete(tool.id);
		favoriteIds.value = next;
		writeFavoriteIds(next);
		tools.value = tools.value.map(item => (item.id === tool.id ? { ...item, isFavorite: data.favorited } : item));
	} catch (err) {
		favoriteIds.value = previous;
		tools.value = tools.value.map(item => (item.id === tool.id ? { ...item, isFavorite: previous.has(tool.id) } : item));
		alert((err as Error).message || '收藏失败，请稍后重试');
	}
}

async function loadStudyMeta() {
	const data = await apiRequest<StudyCategory[]>('/app/toolbox/study/categories', 'GET', undefined, false);
	studyCategories.value = [{ id: 0, name: '全部内容', code: 'all' }, ...(data || [])];
	await loadStudyVideos();
}

function selectStudyCategory(code: string) {
	activeStudyCategory.value = code;
	loadStudyVideos();
}

function studyCategoryName(code?: string) {
	return studyCategories.value.find(item => item.code === code)?.name || code || '全部内容';
}

async function loadStudyVideos() {
	loadingStudy.value = true;
	try {
		const params = new URLSearchParams({
			page: '1',
			size: '24',
			sort: studySort.value,
			category: activeStudyCategory.value === 'all' ? '' : activeStudyCategory.value,
			keyword: activeView.value === 'study' ? keyword.value.trim() : ''
		});
		const data = await apiRequest<{ list: StudyVideo[] }>(`/app/toolbox/study/videos?${params}`, 'GET', undefined, false);
		studyVideos.value = (data.list || []).sort((a, b) => Number(b.sort || 0) - Number(a.sort || 0));
	} finally {
		loadingStudy.value = false;
	}
}

async function openStudy(item: StudyVideo) {
	const data = await apiRequest<StudyVideo>(`/app/toolbox/study/videos/${item.id}`, 'GET', undefined, false).catch(() => item);
	activeStudyVideo.value = data || item;
}

async function loadUnreadCount() {
	if (!currentUser.value) return;
	const data = await apiRequest<{ count: number }>('/app/message/unreadCount');
	unreadCount.value = data.count || 0;
}

async function toggleMessages() {
	if (!currentUser.value) {
		showLogin.value = true;
		return;
	}
	showMessages.value = true;
	const data = await apiRequest<{ list: Message[] }>('/app/message/list?page=1&size=30');
	messagesPanel.value = data.list || [];
}

async function readMessage(item: Message) {
	await apiRequest('/app/message/read', 'POST', { messageId: item.id }).catch(() => null);
	alert(`${item.title}\n\n${item.content || '暂无详情'}`);
	await loadUnreadCount();
}

async function loadAiMeta() {
	if (!currentUser.value) {
		aiModels.value = [];
		templates.value = [];
		return;
	}
	const [models, tpl] = await Promise.all([
		apiRequest<{ list: AiModel[] }>('/app/ai/models').catch(() => ({ list: [] })),
		apiRequest<{ list: AiTemplate[] }>('/app/ai/templates').catch(() => ({ list: [] }))
	]);
	aiModels.value = models.list || [];
	templates.value = tpl.list || [];
	const defaultModel = textModels.value.find(item => item.isDefault) || textModels.value[0];
	if (defaultModel && !selectedModelId.value) {
		selectedModelId.value = defaultModel.modelId;
		thinking.value = Boolean(defaultModel.thinkingDefault);
	}
	syncSelectedModelForMode();
}

function syncSelectedModelForMode() {
	const currentModels = modeModels.value;
	if (!currentModels.some(item => item.modelId === selectedModelId.value)) {
		const nextModel = currentModels.find(item => item.isDefault) || currentModels[0];
		selectedModelId.value = nextModel?.modelId || '';
		if (aiMode.value === 'text' && nextModel) {
			thinking.value = Boolean(nextModel.thinkingDefault);
		}
	}
}

async function ensureAiReady() {
	if (!currentUser.value) {
		return;
	}
	await Promise.allSettled([loadAiMeta(), loadConversations(true)]);
}

async function loadConversations(autoOpen = false) {
	const data = await apiRequest<{ list: AiConversation[] }>('/app/ai/conversations?page=1&size=50');
	conversations.value = data.list || [];
	if (autoOpen && !activeConversation.value && conversations.value[0]) {
		await loadConversation(conversations.value[0].id);
	}
}

async function loadConversation(id: number) {
	const data = await apiRequest<{ conversation: AiConversation; messages: AiMessage[] }>(`/app/ai/conversations/${id}`);
	activeConversation.value = data.conversation;
	messages.value = data.messages || [];
	selectedModelId.value = data.conversation.modelId || selectedModelId.value;
	await scrollMessages();
}

function newConversation() {
	activeConversation.value = null;
	messages.value = [];
	aiInput.value = '';
}

function useTemplate(item: AiTemplate) {
	aiInput.value = item.prompt;
	aiMode.value = item.category?.includes('image') ? 'image' : 'text';
	syncSelectedModelForMode();
}

async function sendAi() {
	if (!currentUser.value) {
		showLogin.value = true;
		return;
	}
	if (!aiInput.value.trim()) return;

	const prompt = aiInput.value.trim();
	aiError.value = '';
	isAiSending.value = true;
	messages.value.push({ localId: `u-${Date.now()}`, role: 'user', content: prompt });
	aiInput.value = '';
	await scrollMessages();

	try {
		if (aiMode.value === 'text') {
			await sendTextAi(prompt);
		} else {
			await generateMedia(prompt);
		}
		await loadConversations();
	} catch (err) {
		aiError.value = friendlyError((err as Error).message);
	} finally {
		isAiSending.value = false;
	}
}

async function sendTextAi(prompt: string) {
	const assistant: AiMessage = { localId: `a-${Date.now()}`, role: 'assistant', content: '' };
	messages.value.push(assistant);

	if (window.ReadableStream && selectedModelId.value) {
		const response = await fetch(`${API_BASE}/app/ai/chat/stream`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: readSession().token || ''
			},
			body: JSON.stringify({
				conversationId: activeConversation.value?.id,
				content: prompt,
				modelId: selectedModelId.value,
				thinking: thinking.value,
				mode: 'agent'
			})
		});
		if (!response.ok || !response.body) throw new Error('AI 流式接口不可用');
		await readSse(response, data => {
			if (data.type === 'meta') activeConversation.value = data.conversation;
			if (data.type === 'delta') assistant.content = `${assistant.content || ''}${data.content || ''}`;
			if (data.type === 'reasoning') assistant.reasoningContent = `${assistant.reasoningContent || ''}${data.content || ''}`;
			if (data.type === 'error') throw new Error(data.error || 'AI 生成失败');
			scrollMessages();
		});
		return;
	}

	const data = await apiRequest<{ conversation: AiConversation; message: AiMessage }>('/app/ai/chat/send', 'POST', {
		conversationId: activeConversation.value?.id,
		content: prompt,
		modelId: selectedModelId.value,
		thinking: thinking.value,
		mode: 'agent'
	});
	activeConversation.value = data.conversation;
	Object.assign(assistant, data.message);
}

async function generateMedia(prompt: string) {
	syncSelectedModelForMode();
	const model = modeModels.value.find(item => item.modelId === selectedModelId.value) ||
		modeModels.value.find(item => item.isDefault) ||
		modeModels.value[0];
	const data = await apiRequest<{ conversation: AiConversation; generation: any; message: AiMessage }>('/app/ai/generate', 'POST', {
		conversationId: activeConversation.value?.id,
		type: aiMode.value,
		prompt,
		modelId: model?.modelId,
		size: aiMode.value === 'image' ? '1920x1920' : undefined
	});
	activeConversation.value = data.conversation;
	messages.value.push({
		...data.message,
		role: 'assistant',
		outputUrls: data.generation?.outputUrls || [],
		content: generationResultText(data.message?.content, data.generation?.outputUrls || [])
	});
}

async function readSse(response: Response, onData: (data: any) => void) {
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const chunks = buffer.split('\n\n');
		buffer = chunks.pop() || '';
		for (const chunk of chunks) {
			const line = chunk.split('\n').find(item => item.startsWith('data:'));
			if (!line) continue;
			onData(JSON.parse(line.replace(/^data:\s*/, '')));
		}
	}
}

async function login() {
	isLoggingIn.value = true;
	loginError.value = '';
	try {
		const anonymousFavorites = readFavoriteIds(null);
		const token = await apiRequest<Session>('/app/user/login/password', 'POST', loginForm, false);
		writeSession(token);
		const user = await apiRequest<UserInfo>('/app/user/info/person');
		currentUser.value = user;
		writeSession({ ...readSession(), user });
		favoriteIds.value = mergeFavoriteIds(readFavoriteIds(user), anonymousFavorites);
		writeFavoriteIds(favoriteIds.value, user);
		await syncFavoriteIdsToCloud(favoriteIds.value);
		showLogin.value = false;
		await Promise.allSettled([loadHome(), loadUnreadCount(), loadAiMeta(), loadConversations(true)]);
	} catch (err) {
		loginError.value = (err as Error).message || '登录失败';
	} finally {
		isLoggingIn.value = false;
	}
}

function logout() {
	localStorage.removeItem(SESSION_KEY);
	currentUser.value = null;
	showProfile.value = false;
	favoriteIds.value = readFavoriteIds(null);
	tools.value = tools.value.map(tool => ({ ...tool, isFavorite: favoriteIds.value.has(tool.id) }));
	messages.value = [];
	conversations.value = [];
}

async function apiRequest<T>(path: string, method: 'GET' | 'POST' = 'GET', data?: unknown, auth = true) {
	const session = readSession();
	const response = await fetch(`${API_BASE}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(auth && session.token ? { Authorization: session.token } : {})
		},
		body: method === 'POST' ? JSON.stringify(data || {}) : undefined
	});
	if (auth && response.status === 401) {
		throw new Error('请先登录后再继续使用');
	}
	const contentType = response.headers.get('content-type') || '';
	const rawText = await response.text();
	let envelope: ApiEnvelope<T> = {} as ApiEnvelope<T>;

	if (rawText) {
		if (contentType.includes('application/json')) {
			envelope = JSON.parse(rawText) as ApiEnvelope<T>;
		} else {
			throw new Error(rawText.slice(0, 120) || `接口返回格式异常(${response.status})`);
		}
	}

	if (!response.ok || (typeof envelope.code === 'number' && envelope.code !== 1000)) {
		if (!auth && envelope.code === 1001) {
			return undefined as T;
		}
		throw new Error(envelope.message || `接口请求失败(${response.status})`);
	}
	return envelope.data as T;
}

function readSession(): Session {
	try {
		return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
	} catch {
		return {};
	}
}

async function restoreSessionUser() {
	const session = readSession();
	if (!session.token) return;
	if (session.user?.id) {
		currentUser.value = session.user;
		return;
	}
	try {
		const user = await apiRequest<UserInfo>('/app/user/info/person');
		currentUser.value = user;
		writeSession({ ...session, user });
	} catch {
		localStorage.removeItem(SESSION_KEY);
		currentUser.value = null;
	}
}

function writeSession(session: Session) {
	localStorage.setItem(SESSION_KEY, JSON.stringify(session || {}));
}

function favoriteStorageKey(user: UserInfo | null = currentUser.value) {
	const identity = user?.id || user?.phone || 'anonymous';
	return `${FAVORITE_KEY_PREFIX}.${identity}`;
}

function readFavoriteIds(user: UserInfo | null = currentUser.value) {
	try {
		const ids = JSON.parse(localStorage.getItem(favoriteStorageKey(user)) || '[]');
		return new Set(Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : []);
	} catch {
		return new Set<number>();
	}
}

function writeFavoriteIds(ids: Set<number>, user: UserInfo | null = currentUser.value) {
	localStorage.setItem(favoriteStorageKey(user), JSON.stringify(Array.from(ids)));
}

function mergeFavoriteIds(...sets: Set<number>[]) {
	return new Set(sets.flatMap(ids => Array.from(ids)));
}

async function syncFavoriteIdsToCloud(ids: Set<number>) {
	if (!currentUser.value || ids.size === 0) return;
	await Promise.allSettled(
		Array.from(ids).map(toolId =>
			apiRequest('/app/toolbox/favorite', 'POST', {
				toolId,
				favorited: true
			})
		)
	);
}

function compareSort(a: { sort?: number; id?: number }, b: { sort?: number; id?: number }) {
	return Number(b.sort || 0) - Number(a.sort || 0) || Number(b.id || 0) - Number(a.id || 0);
}

function normalizeAsset(url?: string) {
	if (!url) return '';
	if (/^https?:\/\//i.test(url)) return url;
	if (url.startsWith('/')) return url;
	return `/${url}`;
}

function isIconImage(icon?: string) {
	return Boolean(icon && /(\.(png|jpe?g|webp|gif|svg)(\?.*)?$|^\/|^https?:\/\/)/i.test(icon));
}

function iconGlyph(icon?: string, fallback = '') {
	const value = String(icon || '').trim();
	const key = value.toLowerCase();
	if (iconGlyphMap[key]) return iconGlyphMap[key];
	if (key.startsWith('icon-') && iconGlyphMap[key.replace(/^icon-/, '')]) {
		return iconGlyphMap[key.replace(/^icon-/, '')];
	}
	if (/^[a-z0-9_-]{3,}$/i.test(value)) {
		return fallback.slice(0, 1) || '用';
	}
	return value || fallback.slice(0, 1) || '用';
}

function toolIconTone(tool: Tool) {
	if (tool.type === 'external_link') return 'tone-link';
	if (tool.type === 'local_plugin') return 'tone-plugin';
	if (tool.categoryId === 105) return 'tone-study';
	return 'tone-tool';
}

function truncate(value = '', max = 20) {
	return value.length > max ? `${value.slice(0, max)}...` : value;
}

function friendlyError(message = '') {
	if (message.includes('timeout') || message.includes('超时')) return '应用接口请求超时，请稍后重试或检查模型配置。';
	if (message.includes('model') || message.includes('endpoint')) return '模型或接入点不可用，请到后台 AI 模型管理确认模型 ID、Base URL 和权限。';
	if (message.includes('size')) return '生成尺寸参数不合法，请检查后台模型配置，图片默认使用 1920x1920。';
	return message || '请求失败，请稍后重试';
}

function isImage(url: string) {
	return /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(url);
}

function isImageOutput(url: string, message: AiMessage) {
	if (isImage(url)) return true;
	const content = `${message.content || ''} ${url}`.toLowerCase();
	return /图片|图像|image|img|photo|seedream|tos-|volces|byteimg|doubao/.test(content);
}

function extractUrls(text?: string) {
	const matches = String(text || '').match(/https?:\/\/[^\s"'<>]+|data:(?:image|audio|video)\/[^\s"'<>]+/gi);
	return matches ? Array.from(new Set(matches.map(item => item.replace(/[),.;，。；]+$/g, '')))) : [];
}

function messageOutputUrls(message: AiMessage) {
	return Array.from(new Set([...(message.outputUrls || []), ...extractUrls(message.content)]));
}

function displayMessageContent(message: AiMessage) {
	return String(message.content || '')
		.replace(/https?:\/\/[^\s"'<>]+|data:(?:image|audio|video)\/[^\s"'<>]+/gi, '')
		.replace(/图片生成完成[:：]?\s*/g, '图片生成完成')
		.trim();
}

function generationResultText(content?: string, outputUrls: string[] = []) {
	const text = displayMessageContent({ role: 'assistant', content, outputUrls });
	if (text) return text;
	return outputUrls.length ? `${generationTypes.find(item => item.type === aiMode.value)?.label}完成` : `${generationTypes.find(item => item.type === aiMode.value)?.label}任务已提交`;
}

function imageFileName(url: string) {
	const name = url.split('?')[0].split('/').filter(Boolean).pop();
	return /\.(png|jpe?g|webp|gif|bmp)$/i.test(name || '') ? name : `brmtool-ai-image-${Date.now()}.png`;
}

function isAudio(url: string) {
	return /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(url);
}

function isVideo(url: string) {
	return /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(url);
}

function copyText(text?: string) {
	if (!text) return;
	navigator.clipboard?.writeText(text);
}

async function scrollMessages() {
	await nextTick();
	if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
}
</script>

<style scoped>
.web-toolbox {
	min-height: 100vh;
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	color: #eef8ff;
	background:
		linear-gradient(rgba(11, 49, 84, 0.25) 1px, transparent 1px),
		linear-gradient(90deg, rgba(11, 49, 84, 0.25) 1px, transparent 1px),
		radial-gradient(circle at 70% 10%, rgba(0, 157, 255, 0.32), transparent 34%),
		#061426;
	background-size: 48px 48px, 48px 48px, auto, auto;
	font-family: "DIN Alternate", "PingFang SC", sans-serif;
	overflow: hidden;
}

.web-toolbox *,
.web-toolbox *::before,
.web-toolbox *::after {
	box-sizing: border-box;
}

button,
input,
textarea,
select {
	font: inherit;
}

button {
	cursor: pointer;
	transition:
		border-color 0.18s ease,
		background 0.18s ease,
		color 0.18s ease,
		transform 0.18s ease,
		box-shadow 0.18s ease;
}

button:hover,
.runner-bar a:hover {
	border-color: rgba(51, 222, 255, 0.72);
	color: #82f6ff;
	box-shadow: 0 10px 28px rgba(0, 170, 255, 0.14);
	transform: translateY(-1px);
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
	outline: 2px solid rgba(58, 231, 255, 0.78);
	outline-offset: 3px;
}

.sidebar {
	position: sticky;
	top: 0;
	width: 236px;
	min-height: 100vh;
	padding: 18px 12px;
	border-right: 1px solid rgba(55, 167, 255, 0.24);
	background: rgba(4, 15, 30, 0.82);
	transition: width 0.2s ease;
}

.sidebar.collapsed {
	width: 78px;
}

.brand,
.topbar,
.runner-bar,
.section-title,
.filter-bar,
.drawer-head {
	display: flex;
	align-items: center;
	gap: 12px;
}

.brand {
	justify-content: space-between;
	margin-bottom: 30px;
}

.brand-logo,
.nav-icon,
.tool-icon {
	display: grid;
	place-items: center;
	border: 1px solid rgba(36, 207, 255, 0.64);
	background: linear-gradient(135deg, rgba(0, 168, 255, 0.28), rgba(0, 255, 221, 0.08));
	color: #5df1ff;
}

.nav-icon,
.mini-icon,
.tool-icon {
	overflow: hidden;
	letter-spacing: 0;
	line-height: 1;
	text-transform: uppercase;
}

.brand-logo {
	width: 42px;
	height: 42px;
	border-radius: 12px;
	font-weight: 900;
}

.brand button,
.top-actions button,
.runner-bar button,
.runner-bar a,
.filter-bar button,
.section-title button,
.composer button,
.drawer button,
.login-modal button,
.detail-modal button,
.model-controls select {
	border: 1px solid rgba(72, 159, 255, 0.35);
	background: rgba(9, 26, 48, 0.86);
	color: #d7efff;
	border-radius: 10px;
	padding: 9px 14px;
	text-decoration: none;
}

.nav-list {
	display: grid;
	gap: 10px;
}

.nav-list button {
	display: grid;
	grid-template-columns: 36px 1fr auto;
	align-items: center;
	gap: 10px;
	min-height: 50px;
	width: 100%;
	padding: 0 10px 0 0;
	border: 1px solid transparent;
	border-radius: 10px;
	background: transparent;
	color: #a8bad8;
	text-align: left;
}

.sidebar.collapsed .nav-list button {
	grid-template-columns: 36px;
	justify-content: center;
}

.nav-list button.active {
	border-color: #1acbff;
	background: linear-gradient(90deg, rgba(0, 174, 255, 0.44), rgba(0, 115, 255, 0.16));
	color: #fff;
	box-shadow: inset 3px 0 0 #1beaff;
}

.nav-list button:hover {
	background: rgba(17, 76, 124, 0.32);
	color: #e8f7ff;
}

.nav-icon {
	width: 34px;
	height: 34px;
	border-radius: 9px;
	font-weight: 800;
}

.nav-list em {
	min-width: 26px;
	border-radius: 999px;
	background: rgba(24, 205, 188, 0.24);
	color: #5effe8;
	text-align: center;
	font-style: normal;
}

.usage-card {
	margin-top: auto;
	position: fixed;
	bottom: 18px;
	left: 12px;
	width: 210px;
	padding: 20px;
	border: 1px solid rgba(26, 203, 255, 0.38);
	border-radius: 10px;
	background: rgba(6, 42, 82, 0.78);
}

.sidebar.collapsed .usage-card {
	display: none;
}

.usage-card strong {
	display: block;
	font-size: 36px;
	margin: 6px 0;
}

.workspace {
	min-width: 0;
	height: 100vh;
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	padding: 22px;
	overflow: hidden;
	scrollbar-gutter: stable;
}

.topbar {
	justify-content: space-between;
	margin-bottom: 18px;
}

.search {
	display: flex;
	align-items: center;
	gap: 12px;
	width: min(760px, 54vw);
	height: 48px;
	padding: 0 18px;
	border: 1px solid #1c9ceb;
	border-radius: 10px;
	background: rgba(5, 18, 35, 0.86);
	box-shadow: 0 0 28px rgba(0, 166, 255, 0.14);
}

.search:focus-within {
	border-color: #35e3ff;
	box-shadow: 0 0 0 3px rgba(53, 227, 255, 0.12), 0 0 34px rgba(0, 166, 255, 0.22);
}

.search input,
.runner-bar input,
.composer textarea,
.login-modal input {
	width: 100%;
	border: 0;
	outline: 0;
	color: #eef8ff;
	background: transparent;
}

.top-actions {
	display: flex;
	gap: 10px;
	align-items: center;
}

.mobile-nav {
	display: none;
}

.notice-btn {
	position: relative;
}

.notice-btn b {
	position: absolute;
	right: -6px;
	top: -6px;
	min-width: 18px;
	border-radius: 999px;
	background: #19f0ff;
	color: #001524;
}

.user-btn span {
	display: inline-grid;
	place-items: center;
	width: 28px;
	height: 28px;
	margin-right: 8px;
	border-radius: 50%;
	background: #d7e7ff;
	color: #082242;
}

.home-banner,
.category-banner {
	position: relative;
	min-height: 150px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 26px 32px;
	border: 1px solid rgba(39, 157, 242, 0.42);
	border-radius: 10px;
	background: linear-gradient(100deg, rgba(5, 20, 38, 0.92), rgba(0, 125, 206, 0.25));
	overflow: hidden;
}

.home-banner::after,
.category-banner::after {
	content: "";
	position: absolute;
	inset: -1px;
	background:
		radial-gradient(circle at 80% 20%, rgba(40, 232, 255, 0.22), transparent 24%),
		linear-gradient(120deg, transparent 0 42%, rgba(255, 255, 255, 0.08) 50%, transparent 58%);
	pointer-events: none;
}

.home-banner > div:first-child,
.category-banner > div:first-child {
	position: relative;
	z-index: 1;
	min-width: 0;
}

.home-banner h1,
.category-banner h1,
.ai-head h1 {
	margin: 0;
	font-size: clamp(30px, 4vw, 48px);
	letter-spacing: 0;
}

.banner-cube {
	position: relative;
	width: 180px;
	height: 110px;
}

.banner-cube span {
	position: absolute;
	width: 64px;
	height: 64px;
	border: 1px solid #1cf0ff;
	background: rgba(0, 172, 255, 0.18);
	box-shadow: 0 0 24px rgba(28, 240, 255, 0.32);
	transform: rotate(45deg);
}

.banner-cube span:nth-child(2) {
	left: 56px;
	top: 26px;
}

.banner-cube span:nth-child(3) {
	right: 0;
	top: 6px;
}

.favorites,
.tool-page,
.study-page {
	min-height: 0;
	overflow: auto;
	padding-bottom: 40px;
	scrollbar-gutter: stable;
}

.favorites::-webkit-scrollbar,
.tool-page::-webkit-scrollbar,
.study-page::-webkit-scrollbar,
.message-list::-webkit-scrollbar,
.drawer::-webkit-scrollbar {
	width: 8px;
	height: 8px;
}

.favorites::-webkit-scrollbar-thumb,
.tool-page::-webkit-scrollbar-thumb,
.study-page::-webkit-scrollbar-thumb,
.message-list::-webkit-scrollbar-thumb,
.drawer::-webkit-scrollbar-thumb {
	border-radius: 999px;
	background: rgba(62, 187, 255, 0.28);
}

.section-title {
	justify-content: space-between;
	margin: 22px 0 14px;
	gap: 16px;
}

.section-title > div {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.section-title h2 {
	margin: 0;
	font-size: 22px;
}

.section-title button.active,
.filter-bar button.active,
.composer button.active {
	border-color: #20d8ff;
	color: #5ff6ff;
	background: rgba(0, 152, 255, 0.32);
}

.mini-grid,
.tool-grid,
.study-grid,
.template-grid {
	display: grid;
	gap: 14px;
}

.mini-grid {
	grid-template-columns: repeat(5, minmax(160px, 1fr));
}

.favorite-empty {
	display: flex;
	align-items: center;
	gap: 14px;
	min-height: 76px;
	padding: 18px 20px;
	border: 1px dashed rgba(87, 155, 209, 0.42);
	border-radius: 8px;
	background: rgba(7, 22, 40, 0.58);
	color: #9db1d0;
}

.favorite-empty strong {
	color: #eef8ff;
	font-size: 16px;
	white-space: nowrap;
}

.favorite-empty span {
	min-width: 0;
	flex: 1;
	line-height: 1.6;
}

.favorite-empty button {
	flex: 0 0 auto;
	border: 1px solid rgba(55, 209, 255, 0.52);
	border-radius: 8px;
	background: rgba(0, 135, 204, 0.24);
	color: #8fefff;
	padding: 8px 12px;
}

.tool-grid,
.study-grid {
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.mini-grid article,
.tool-card,
.study-card,
.template-grid button,
.message-row {
	position: relative;
	border: 1px solid rgba(86, 149, 204, 0.28);
	border-radius: 8px;
	background:
		linear-gradient(180deg, rgba(14, 39, 68, 0.92), rgba(6, 18, 34, 0.92)),
		rgba(8, 23, 42, 0.92);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 14px 32px rgba(0, 0, 0, 0.18);
	color: #eef8ff;
	text-align: left;
	overflow: hidden;
	transition:
		border-color 0.18s ease,
		background 0.18s ease,
		transform 0.18s ease,
		box-shadow 0.18s ease;
}

.mini-grid article::before,
.tool-card::before,
.study-card::before,
.template-grid button::before {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background: linear-gradient(135deg, rgba(78, 219, 255, 0.12), transparent 36%);
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.18s ease;
}

.mini-grid article:hover,
.tool-card:hover,
.study-card:hover,
.template-grid button:hover {
	border-color: rgba(58, 218, 255, 0.62);
	background:
		linear-gradient(180deg, rgba(17, 51, 88, 0.96), rgba(8, 24, 43, 0.96)),
		rgba(8, 23, 42, 0.96);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 18px 38px rgba(0, 0, 0, 0.24);
	transform: translateY(-2px);
}

.mini-grid article:hover::before,
.tool-card:hover::before,
.study-card:hover::before,
.template-grid button:hover::before {
	opacity: 1;
}

.mini-grid article {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 18px;
}

.mini-icon {
	display: grid;
	place-items: center;
	width: 54px;
	height: 54px;
	flex: 0 0 auto;
	border: 1px solid rgba(29, 220, 255, 0.46);
	border-radius: 8px;
	color: #60f4ff;
	font-weight: 800;
	font-size: 18px;
}

.mini-grid button,
.fav {
	position: absolute;
	right: 14px;
	top: 14px;
	width: 34px;
	height: 34px;
	border-radius: 9px;
	border: 1px solid rgba(255, 201, 74, 0.62);
	background: rgba(40, 30, 8, 0.78);
	color: #ffd666;
	font-size: 20px;
	z-index: 2;
}

.mini-grid button:hover,
.fav:hover {
	border-color: rgba(255, 218, 100, 0.9);
	background: rgba(82, 58, 11, 0.9);
	color: #fff0a8;
	box-shadow: 0 0 18px rgba(255, 208, 82, 0.22);
	transform: translateY(-1px) scale(1.04);
}

.fav.active {
	background: rgba(255, 201, 74, 0.2);
	color: #ffd052;
}

.tool-card {
	min-height: 164px;
	display: grid;
	grid-template-columns: 76px minmax(0, 1fr);
	gap: 16px;
	padding: 22px 54px 22px 20px;
}

.tool-icon {
	width: 64px;
	height: 64px;
	align-self: start;
	border-radius: 8px;
	font-size: 22px;
	font-weight: 900;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 12px 28px rgba(0, 0, 0, 0.22);
}

.tool-icon img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.tool-icon span {
	display: block;
	max-width: 54px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tone-tool {
	border-color: rgba(64, 203, 255, 0.54);
	background: linear-gradient(135deg, rgba(0, 139, 222, 0.38), rgba(15, 54, 96, 0.82));
	color: #8eeaff;
}

.tone-link {
	border-color: rgba(81, 222, 179, 0.5);
	background: linear-gradient(135deg, rgba(20, 154, 118, 0.34), rgba(19, 66, 80, 0.82));
	color: #93ffd9;
}

.tone-plugin {
	border-color: rgba(255, 202, 91, 0.56);
	background: linear-gradient(135deg, rgba(182, 121, 27, 0.34), rgba(62, 49, 25, 0.86));
	color: #ffe08a;
}

.tone-study {
	border-color: rgba(169, 214, 120, 0.52);
	background: linear-gradient(135deg, rgba(92, 139, 57, 0.34), rgba(32, 60, 45, 0.86));
	color: #cbff9d;
}

.tool-card h3,
.study-card h3 {
	margin: 0 0 8px;
	font-size: 20px;
	line-height: 1.25;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tool-card p,
.study-card p,
.category-banner p,
.home-banner p {
	color: #9db1d0;
	line-height: 1.6;
}

.tool-card p {
	min-height: 48px;
	margin: 0 0 10px;
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.tool-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.tag,
.study-card span,
.template-grid span {
	display: inline-block;
	min-width: 0;
	max-width: 104px;
	padding: 4px 8px;
	border: 1px solid rgba(38, 224, 199, 0.45);
	border-radius: 6px;
	color: #61ffe7;
	font-size: 12px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tag-web {
	border-color: rgba(96, 204, 255, 0.48);
	color: #9fe6ff;
}

.tag-link {
	border-color: rgba(91, 225, 175, 0.46);
	color: #9effda;
}

.tag-desktop {
	border-color: rgba(255, 202, 91, 0.5);
	color: #ffe08a;
}

.tag-locked {
	border-color: rgba(255, 129, 129, 0.48);
	color: #ffb6b6;
}

.empty {
	margin: 18px 0 0;
	padding: 20px;
	border: 1px dashed rgba(91, 160, 220, 0.34);
	border-radius: 12px;
	background: rgba(5, 20, 38, 0.5);
	text-align: center;
}

.empty.error {
	border-color: rgba(255, 129, 129, 0.38);
	color: #ffd0d0;
	background: rgba(80, 24, 24, 0.22);
}

.filter-bar {
	justify-content: space-between;
	padding: 12px;
	margin: 18px 0;
	border: 1px solid rgba(35, 148, 230, 0.38);
	border-radius: 10px;
	background: rgba(6, 20, 38, 0.72);
	flex-wrap: wrap;
}

.study-overview {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
	margin: 16px 0 0;
}

.study-overview > div {
	position: relative;
	overflow: hidden;
	min-height: 92px;
	padding: 18px;
	border: 1px solid rgba(58, 178, 255, 0.28);
	border-radius: 14px;
	background:
		linear-gradient(135deg, rgba(17, 65, 105, 0.72), rgba(5, 18, 34, 0.82)),
		rgba(6, 20, 38, 0.72);
}

.study-overview > div::after {
	content: "";
	position: absolute;
	right: -24px;
	top: -28px;
	width: 86px;
	height: 86px;
	border: 1px solid rgba(69, 225, 255, 0.22);
	transform: rotate(45deg);
}

.study-overview span,
.study-overview small {
	display: block;
	color: #8aa6c8;
}

.study-overview strong {
	display: block;
	margin: 6px 0;
	color: #f2fbff;
	font-size: 28px;
}

.study-filter {
	align-items: center;
}

.category-tabs {
	display: flex;
	gap: 10px;
	flex: 1 1 420px;
	min-width: 0;
	overflow-x: auto;
	scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
	display: none;
}

.category-tabs button {
	flex: 0 0 auto;
}

.study-card {
	display: grid;
	grid-template-columns: 150px minmax(0, 1fr);
	gap: 16px;
	min-height: 178px;
	padding: 14px;
}

.cover {
	position: relative;
	height: 110px;
	border-radius: 8px;
	background: rgba(10, 34, 62, 0.86);
	overflow: hidden;
	display: grid;
	place-items: center;
}

.cover::after {
	content: "";
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, transparent 48%, rgba(0, 0, 0, 0.46));
	pointer-events: none;
}

.cover > span {
	position: relative;
	z-index: 1;
	display: grid;
	place-items: center;
	width: 42px;
	height: 42px;
	border: 1px solid rgba(100, 235, 255, 0.55);
	border-radius: 50%;
	background: rgba(0, 120, 190, 0.2);
	color: #dffbff;
}

.cover em {
	position: absolute;
	right: 8px;
	bottom: 8px;
	z-index: 1;
	max-width: calc(100% - 16px);
	padding: 3px 8px;
	border-radius: 999px;
	background: rgba(2, 11, 22, 0.72);
	color: #cfefff;
	font-size: 12px;
	font-style: normal;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cover img,
.detail-modal img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.study-card > div:last-child {
	min-width: 0;
	display: grid;
	grid-template-rows: auto auto minmax(0, 1fr) auto auto;
	align-content: start;
}

.study-card h3 {
	margin-top: 8px;
}

.study-card p {
	margin: 0 0 8px;
	display: -webkit-box;
	min-height: 44px;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.study-card small {
	color: #8fa9c8;
}

.study-card button {
	width: max-content;
	margin-top: 10px;
	padding: 7px 12px;
	border: 1px solid rgba(58, 218, 255, 0.45);
	border-radius: 999px;
	background: rgba(0, 134, 206, 0.18);
	color: #91efff;
}

.web-runner,
.ai-workspace {
	height: 100%;
	min-height: 0;
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	overflow: hidden;
}

.runner-bar {
	margin-bottom: 10px;
}

.runner-title {
	font-weight: 800;
	white-space: nowrap;
}

.iframe-stage {
	position: relative;
	min-height: 0;
	border: 1px solid rgba(35, 148, 230, 0.52);
	border-radius: 10px;
	background: #071526;
	overflow: hidden;
}

.iframe-stage iframe {
	width: 100%;
	height: 100%;
	border: 0;
	background: #fff;
}

.iframe-tip {
	position: absolute;
	left: 14px;
	bottom: 10px;
	margin: 0;
	padding: 6px 10px;
	border-radius: 999px;
	background: rgba(3, 13, 26, 0.72);
	color: #9db1d0;
	font-size: 12px;
}

.ai-shell {
	height: 100%;
	min-height: 0;
	display: grid;
	grid-template-columns: 282px minmax(0, 1fr);
	border: 1px solid rgba(74, 137, 199, 0.34);
	border-radius: 18px;
	background:
		linear-gradient(135deg, rgba(12, 30, 52, 0.94), rgba(5, 13, 25, 0.96)),
		rgba(4, 13, 26, 0.72);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 44px rgba(0, 0, 0, 0.22);
	overflow: hidden;
}

.ai-history {
	min-height: 0;
	padding: 18px;
	border-right: 1px solid rgba(74, 137, 199, 0.22);
	background: rgba(4, 13, 26, 0.44);
	overflow: auto;
}

.ai-history > div,
.ai-history button {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.ai-history button {
	margin: 8px 0;
	padding: 12px;
	border: 0;
	border-radius: 10px;
	background: transparent;
	color: #ddecff;
	text-align: left;
}

.ai-history button.active,
.history-action {
	border: 1px solid rgba(58, 218, 255, 0.32);
	background: rgba(0, 126, 189, 0.2);
}

.ai-history small {
	color: #7f91ad;
}

.ai-main {
	position: relative;
	height: 100%;
	min-height: 0;
	display: grid;
	grid-template-rows: auto minmax(0, 1fr) 146px;
	padding: 24px;
	overflow: hidden;
}

.ai-head {
	display: flex;
	justify-content: space-between;
	gap: 20px;
	align-items: flex-start;
	padding-bottom: 18px;
	border-bottom: 1px solid rgba(74, 137, 199, 0.18);
}

.ai-head span {
	color: #32e9ff;
	font-size: 12px;
	letter-spacing: 0.12em;
}

.ai-head h1 {
	max-width: min(620px, 52vw);
	margin-top: 8px;
	font-size: clamp(26px, 3.2vw, 42px);
	line-height: 1.16;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ai-head p {
	margin: 8px 0 0;
	color: #8ba6c5;
	font-size: 14px;
	line-height: 1.5;
}

.model-controls {
	display: flex;
	gap: 10px;
	align-items: center;
}

.model-controls select {
	min-width: 180px;
	max-width: 260px;
	height: 42px;
}

.model-controls select:disabled {
	color: #7890ad;
	cursor: not-allowed;
	opacity: 0.72;
}

.model-controls label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	white-space: nowrap;
}

.template-grid {
	grid-template-columns: repeat(2, minmax(220px, 1fr));
	margin: 12px 0 24px;
}

.template-grid button {
	padding: 18px;
}

.message-list {
	min-height: 0;
	overflow: auto;
	padding: 10px 4vw 24px;
}

.ai-empty {
	align-self: center;
	justify-self: center;
	width: min(520px, 100%);
	display: grid;
	gap: 14px;
	padding: 34px;
	border: 1px dashed rgba(91, 160, 220, 0.42);
	border-radius: 18px;
	background: rgba(5, 20, 38, 0.58);
	text-align: center;
	color: #9db1d0;
}

.ai-empty span {
	color: #32e9ff;
	font-size: 12px;
	letter-spacing: 0.12em;
}

.ai-empty strong {
	color: #eef8ff;
	font-size: 24px;
}

.ai-empty p {
	margin: 0;
	line-height: 1.7;
}

.ai-empty button {
	justify-self: center;
	width: max-content;
	padding: 10px 18px;
	border: 1px solid rgba(58, 218, 255, 0.48);
	border-radius: 999px;
	background: rgba(0, 134, 206, 0.18);
	color: #91efff;
}

.message {
	max-width: 760px;
	margin: 0 0 18px;
	padding: 16px 18px;
	border-radius: 16px;
	white-space: pre-wrap;
	line-height: 1.8;
}

.message.user {
	margin-left: auto;
	background: rgba(255, 255, 255, 0.09);
}

.message.assistant {
	background: rgba(0, 123, 205, 0.12);
}

.message button {
	margin-top: 10px;
	padding: 5px 10px;
	border-radius: 7px;
	border: 1px solid rgba(135, 181, 222, 0.45);
	background: rgba(8, 28, 52, 0.9);
	color: #cde9ff;
	font-size: 12px;
}

.reasoning {
	margin: 0 0 12px;
	border: 1px solid rgba(77, 201, 226, 0.24);
	border-radius: 10px;
	background: rgba(16, 58, 82, 0.28);
	color: #80cbe3;
}

.reasoning summary {
	padding: 8px 10px;
	color: #8be9ff;
	cursor: pointer;
	user-select: none;
}

.reasoning p {
	margin: 0;
	padding: 0 10px 10px;
	color: #b5dfe9;
}

.outputs {
	display: grid;
	gap: 12px;
	margin-top: 12px;
}

.outputs video {
	max-width: min(420px, 100%);
	border-radius: 12px;
}

.image-output {
	width: min(420px, 100%);
	overflow: hidden;
	border: 1px solid rgba(81, 176, 255, 0.32);
	border-radius: 14px;
	background: rgba(7, 21, 40, 0.72);
	box-shadow: 0 16px 34px rgba(0, 0, 0, 0.22);
}

.image-output > a {
	display: block;
	background: rgba(2, 10, 20, 0.65);
}

.image-output img {
	display: block;
	width: 100%;
	max-height: 420px;
	object-fit: contain;
}

.image-output > div {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 10px 12px;
}

.image-output span {
	color: #9bc4e6;
	font-size: 13px;
}

.image-output a[download] {
	flex: 0 0 auto;
	padding: 7px 12px;
	border: 1px solid rgba(48, 211, 255, 0.48);
	border-radius: 999px;
	color: #80ecff;
	text-decoration: none;
	background: rgba(0, 126, 189, 0.18);
}

.image-output a[download]:hover {
	border-color: rgba(92, 239, 255, 0.78);
	background: rgba(0, 153, 224, 0.28);
	color: #ecfdff;
}

.composer {
	position: relative;
	z-index: 3;
	align-self: end;
	justify-self: center;
	width: min(760px, 82%);
	min-height: 146px;
	display: grid;
	grid-template-rows: auto auto;
	gap: 12px;
	margin: 0;
	padding: 18px;
	border: 1px solid rgba(88, 110, 132, 0.55);
	border-radius: 20px;
	background: rgba(22, 26, 34, 0.96);
	overflow: visible;
}

.composer textarea {
	display: block;
	height: 48px;
	min-height: 48px;
	max-height: 48px;
	resize: none;
	overflow-y: auto;
	line-height: 1.6;
}

.mode-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
	min-height: 0;
	padding-bottom: 2px;
}

.mode-actions .mode-btn {
	flex: 0 0 auto;
	white-space: nowrap;
}

.composer .send {
	flex: 0 0 auto;
	margin-left: auto;
	border-radius: 999px;
	background: #dbe8f9;
	color: #08172b;
	white-space: nowrap;
}

.drawer-mask {
	position: fixed;
	inset: 0;
	z-index: 20;
	display: grid;
	place-items: center;
	background: rgba(0, 5, 12, 0.58);
}

.drawer {
	justify-self: end;
	width: min(420px, 92vw);
	height: 100vh;
	padding: 24px;
	background: #081526;
	border-left: 1px solid rgba(35, 148, 230, 0.38);
	overflow: auto;
}

.message-row {
	display: block;
	width: 100%;
	padding: 16px;
	margin-bottom: 12px;
}

.message-row strong,
.message-row small,
.message-row p {
	display: block;
	margin: 0 0 6px;
}

.message-row small,
.empty {
	color: #8ba0bf;
}

.detail-modal,
.login-modal {
	width: min(560px, 92vw);
	padding: 26px;
	border: 1px solid rgba(35, 148, 230, 0.52);
	border-radius: 16px;
	background: #081526;
}

.detail-modal img {
	height: 260px;
	border-radius: 12px;
}

.detail-modal video {
	width: 100%;
	max-height: 320px;
	border-radius: 12px;
	background: #000;
}

.login-modal {
	display: grid;
	gap: 14px;
}

.login-modal input {
	height: 44px;
	padding: 0 12px;
	border: 1px solid rgba(35, 148, 230, 0.45);
	border-radius: 10px;
	background: rgba(5, 18, 35, 0.9);
}

.ai-error,
.login-modal p {
	color: #ffd4d4;
}

@media (max-width: 980px) {
	.web-toolbox {
		grid-template-columns: 1fr;
	}

	.sidebar {
		display: none;
	}

	.workspace {
		height: auto;
		min-height: 100vh;
		display: block;
		padding: 14px;
		overflow: visible;
	}

	.topbar,
	.ai-head {
		align-items: stretch;
		flex-direction: column;
	}

	.topbar {
		gap: 12px;
		margin-bottom: 14px;
	}

	.search {
		width: 100%;
		height: 48px;
		box-sizing: border-box;
	}

	.top-actions {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.mobile-nav {
		display: flex;
		gap: 10px;
		margin: 0 -14px 14px;
		padding: 0 14px 4px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.mobile-nav::-webkit-scrollbar {
		display: none;
	}

	.mobile-nav button {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		flex: 0 0 auto;
		min-height: 42px;
		padding: 0 12px;
		border: 1px solid rgba(72, 159, 255, 0.35);
		border-radius: 999px;
		background: rgba(9, 26, 48, 0.86);
		color: #cde4ff;
	}

	.mobile-nav button.active {
		border-color: #25dcff;
		background: rgba(0, 152, 255, 0.32);
		color: #f4fdff;
	}

	.mobile-nav span {
		color: #5df1ff;
		font-weight: 800;
	}

	.mobile-nav em {
		min-width: 22px;
		padding: 1px 6px;
		border-radius: 999px;
		background: rgba(24, 205, 188, 0.22);
		color: #5effe8;
		font-style: normal;
		text-align: center;
	}

	.top-actions button {
		min-width: 0;
		padding: 10px 8px;
	}

	.user-btn span {
		margin-right: 4px;
	}

	.home-banner,
	.category-banner {
		position: relative;
		min-height: 190px;
		align-items: flex-start;
		padding: 28px 28px 24px;
	}

	.home-banner h1,
	.category-banner h1,
	.ai-head h1 {
		font-size: 38px;
		line-height: 1.28;
	}

	.home-banner p,
	.category-banner p {
		max-width: 220px;
	}

	.banner-cube {
		position: absolute;
		right: -48px;
		top: 18px;
		width: 150px;
		height: 112px;
		opacity: 0.42;
		pointer-events: none;
	}

	.banner-cube span {
		width: 58px;
		height: 58px;
	}

	.section-title {
		align-items: flex-start;
		flex-direction: column;
		margin-top: 24px;
	}

	.section-title > div {
		width: 100%;
		justify-content: flex-start;
	}

	.section-title > div button {
		flex: 1 1 0;
	}

	.favorite-empty {
		align-items: flex-start;
		flex-direction: column;
		gap: 8px;
		padding: 18px;
	}

	.favorite-empty strong {
		white-space: normal;
	}

	.favorite-empty button {
		width: 100%;
	}

	.study-overview {
		grid-template-columns: 1fr;
	}

	.study-filter {
		align-items: stretch;
		flex-direction: column;
	}

	.category-tabs {
		width: 100%;
		flex-basis: auto;
	}

	.mini-grid,
	.template-grid {
		grid-template-columns: 1fr;
	}

	.tool-grid,
	.study-grid {
		grid-template-columns: 1fr;
	}

	.tool-card {
		grid-template-columns: 64px minmax(0, 1fr);
		min-height: 144px;
		padding: 20px 48px 20px 18px;
	}

	.tool-icon {
		width: 64px;
		height: 64px;
	}

	.tool-card h3,
	.study-card h3 {
		font-size: 18px;
	}

	.tool-card p {
		min-height: 42px;
		line-height: 1.5;
	}

	.study-card {
		grid-template-columns: 1fr;
	}

	.cover {
		height: 180px;
	}

	.ai-shell {
		height: auto;
		min-height: calc(100vh - 122px);
		grid-template-columns: 1fr;
	}

	.ai-history {
		display: none;
	}

	.ai-main {
		min-height: calc(100vh - 122px);
		grid-template-rows: auto minmax(0, 1fr) 158px;
		padding: 18px 14px;
	}

	.message-list {
		padding: 10px 0 18px;
	}

	.composer {
		width: calc(100% - 28px);
		height: 158px;
		min-height: 158px;
		grid-template-rows: 48px 54px;
		padding: 14px;
		border-radius: 18px;
	}

	.composer div {
		align-content: flex-start;
		overflow: auto;
	}

	.composer .send {
		margin-left: 0;
	}
}
</style>
