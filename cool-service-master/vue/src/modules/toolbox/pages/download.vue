<template>
	<main class="download-page">
		<header class="download-header">
			<a class="brand" href="/download" aria-label="数智工具箱下载">
				<span class="brand-mark">数</span>
				<strong>数智工具箱</strong>
			</a>
			<nav class="platform-jump" aria-label="平台下载">
				<a :href="macUrl || undefined" :class="{ disabled: !macUrl }" @click="guardDownload">
					macOS
				</a>
				<a :href="windowsUrl || undefined" :class="{ disabled: !windowsUrl }" @click="guardDownload">
					Windows
				</a>
			</nav>
		</header>

		<section class="hero">
			<div class="hero-copy">
				<span class="eyebrow">Desktop Toolbox</span>
				<h1>数智工具箱桌面端</h1>
				<p>
					把常用工具、外部应用、本地插件和消息通知收进一个统一入口，让日常处理更快、更稳、更清爽。
				</p>

				<div class="download-actions">
					<a
						class="primary-download"
						:class="{ disabled: !primaryLink.url }"
						:href="primaryLink.url || undefined"
						:download="primaryLink.url ? '' : undefined"
						@click="guardDownload"
					>
						<span>{{ primaryLink.label }}</span>
						<small>{{ primaryLink.hint }}</small>
					</a>
					<span class="system-tip">{{ systemTip }}</span>
				</div>

				<div class="feature-row">
					<span>工具聚合</span>
					<span>收藏同步</span>
					<span>内嵌网页</span>
					<span>在线更新</span>
				</div>
			</div>

			<div class="product-stage" aria-hidden="true">
				<div class="app-window">
					<div class="window-bar">
						<i />
						<i />
						<i />
					</div>
					<div class="app-body">
						<aside>
							<span />
							<span />
							<span />
							<span />
						</aside>
						<section>
							<div class="search-line" />
							<div class="banner-line">
								<b />
								<b />
								<b />
							</div>
							<div class="card-grid">
								<span v-for="item in 6" :key="item" />
							</div>
						</section>
					</div>
				</div>
				<div class="orbit one" />
				<div class="orbit two" />
			</div>
		</section>

		<section class="platforms" aria-label="选择平台">
			<article
				v-for="item in platformCards"
				:key="item.key"
				class="platform-card"
				:class="{ active: detectedPlatform === item.key, disabled: !item.url }"
			>
				<div>
					<span class="platform-icon">{{ item.icon }}</span>
					<h2>{{ item.title }}</h2>
					<p>{{ item.description }}</p>
				</div>
				<a :href="item.url || undefined" :download="item.url ? '' : undefined" @click="guardDownload">
					{{ item.url ? item.action : '暂未配置下载地址' }}
				</a>
			</article>
		</section>
	</main>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

defineOptions({
	name: 'toolbox-download'
});

type PlatformKey = 'mac' | 'windows' | 'unknown';

const macUrl = import.meta.env.VITE_DESKTOP_DOWNLOAD_MAC_URL || '';
const windowsUrl = import.meta.env.VITE_DESKTOP_DOWNLOAD_WINDOWS_URL || '';

const detectedPlatform = computed<PlatformKey>(() => {
	const platform = `${navigator.userAgent || ''} ${navigator.platform || ''}`.toLowerCase();

	if (/mac|iphone|ipad|ipod/.test(platform)) {
		return 'mac';
	}

	if (/win/.test(platform)) {
		return 'windows';
	}

	return 'unknown';
});

const platformCards = computed(() => [
	{
		key: 'mac' as const,
		icon: 'MAC',
		title: 'macOS 版',
		description: '适用于 Apple Silicon 与 Intel 芯片的 Mac 设备。',
		action: '下载 macOS 版',
		url: macUrl
	},
	{
		key: 'windows' as const,
		icon: 'WIN',
		title: 'Windows 版',
		description: '适用于 Windows 10 及以上桌面环境。',
		action: '下载 Windows 版',
		url: windowsUrl
	}
]);

const primaryLink = computed(() => {
	const matched = platformCards.value.find(item => item.key === detectedPlatform.value);

	if (matched?.url) {
		return {
			label: matched.action,
			hint: '已根据当前系统自动选择',
			url: matched.url
		};
	}

	if (matched) {
		return {
			label: `${matched.title}暂未配置`,
			hint: '请在生产环境变量中配置安装包地址',
			url: ''
		};
	}

	return {
		label: '选择适合你的版本',
		hint: '请在下方选择 macOS 或 Windows',
		url: ''
	};
});

const systemTip = computed(() => {
	if (detectedPlatform.value === 'mac') {
		return '检测到当前设备为 macOS';
	}

	if (detectedPlatform.value === 'windows') {
		return '检测到当前设备为 Windows';
	}

	return '未识别当前系统，请选择适合你的版本';
});

function guardDownload(event: MouseEvent) {
	const target = event.currentTarget as HTMLAnchorElement | null;

	if (!target?.href) {
		event.preventDefault();
	}
}
</script>

<style lang="scss" scoped>
.download-page {
	position: relative;
	min-height: 100vh;
	overflow: hidden;
	background:
		linear-gradient(rgba(42, 185, 255, 0.055) 1px, transparent 1px),
		linear-gradient(90deg, rgba(42, 185, 255, 0.055) 1px, transparent 1px),
		radial-gradient(circle at 72% 20%, rgba(0, 145, 255, 0.28), transparent 32%),
		linear-gradient(135deg, #04101f 0%, #071d3a 46%, #030b16 100%);
	background-size:
		44px 44px,
		44px 44px,
		auto,
		auto;
	color: #dceeff;
	font-family:
		Outfit,
		'PingFang SC',
		'Hiragino Sans GB',
		'Microsoft YaHei',
		sans-serif;
}

.download-page::before {
	content: '';
	position: absolute;
	inset: 0;
	background:
		linear-gradient(120deg, rgba(3, 13, 29, 0.94), rgba(3, 16, 34, 0.24) 52%),
		radial-gradient(circle at 14% 82%, rgba(32, 239, 212, 0.16), transparent 28%);
	pointer-events: none;
}

.download-header {
	position: relative;
	z-index: 2;
	width: min(1180px, calc(100% - 40px));
	min-height: 78px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
	margin: 0 auto;
}

.brand {
	display: flex;
	align-items: center;
	gap: 12px;
	color: #f0f8ff;
	text-decoration: none;

	strong {
		font-size: clamp(20px, 2vw, 28px);
		font-weight: 800;
	}
}

.brand-mark {
	width: 42px;
	height: 42px;
	display: grid;
	place-items: center;
	border: 1px solid rgba(53, 218, 255, 0.54);
	border-radius: 8px;
	background:
		linear-gradient(145deg, rgba(33, 210, 255, 0.24), rgba(8, 62, 136, 0.32)),
		rgba(7, 28, 58, 0.84);
	color: #4ee8ff;
	font-weight: 900;
	box-shadow: 0 0 26px rgba(29, 166, 255, 0.3);
}

.platform-jump {
	display: flex;
	align-items: center;
	gap: 10px;

	a {
		min-width: 86px;
		height: 36px;
		display: grid;
		place-items: center;
		border: 1px solid rgba(91, 172, 235, 0.32);
		border-radius: 8px;
		background: rgba(6, 29, 61, 0.58);
		color: #a8bddb;
		text-decoration: none;
		font-size: 14px;
	}
}

.hero {
	position: relative;
	z-index: 1;
	width: min(1180px, calc(100% - 40px));
	min-height: calc(100vh - 250px);
	display: grid;
	grid-template-columns: minmax(0, 0.86fr) minmax(360px, 1.14fr);
	align-items: center;
	gap: clamp(28px, 5vw, 72px);
	margin: 0 auto;
	padding: clamp(28px, 5vw, 72px) 0 38px;
}

.hero-copy {
	min-width: 0;
}

.eyebrow {
	display: inline-grid;
	place-items: center;
	height: 30px;
	padding: 0 12px;
	border: 1px solid rgba(36, 207, 255, 0.42);
	border-radius: 999px;
	background: rgba(9, 54, 102, 0.42);
	color: #36ffd4;
	font-size: 13px;
	font-weight: 800;
}

h1 {
	margin-top: 18px;
	color: #f1f8ff;
	font-size: clamp(46px, 7.4vw, 92px);
	font-weight: 900;
	letter-spacing: 0;
	line-height: 1.02;
}

.hero-copy p {
	width: min(560px, 100%);
	margin-top: 22px;
	color: #9fb6d8;
	font-size: clamp(16px, 1.7vw, 20px);
	line-height: 1.8;
}

.download-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 16px;
	margin-top: 34px;
}

.primary-download {
	min-width: 230px;
	min-height: 66px;
	display: grid;
	place-items: center start;
	gap: 4px;
	padding: 12px 24px;
	border: 1px solid rgba(57, 236, 255, 0.72);
	border-radius: 8px;
	background: linear-gradient(180deg, rgba(20, 151, 255, 0.9), rgba(4, 87, 178, 0.82));
	color: #f5fbff;
	text-decoration: none;
	box-shadow:
		0 0 34px rgba(35, 169, 255, 0.32),
		inset 0 0 22px rgba(79, 236, 255, 0.16);

	span {
		font-size: 20px;
		font-weight: 850;
	}

	small {
		color: rgba(236, 251, 255, 0.72);
		font-size: 12px;
	}
}

.system-tip {
	color: #7fc4ee;
	font-size: 14px;
}

.feature-row {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin-top: 28px;

	span {
		padding: 7px 11px;
		border: 1px solid rgba(54, 255, 212, 0.28);
		border-radius: 999px;
		background: rgba(10, 71, 82, 0.32);
		color: #6ff8de;
		font-size: 13px;
		font-weight: 700;
	}
}

.product-stage {
	position: relative;
	min-height: 440px;
	display: grid;
	place-items: center;
}

.app-window {
	position: relative;
	z-index: 1;
	width: min(680px, 100%);
	aspect-ratio: 1.42;
	overflow: hidden;
	border: 1px solid rgba(61, 182, 255, 0.46);
	border-radius: 8px;
	background: rgba(5, 22, 46, 0.84);
	box-shadow:
		0 28px 90px rgba(0, 0, 0, 0.38),
		0 0 48px rgba(0, 149, 255, 0.22),
		inset 0 0 34px rgba(0, 136, 255, 0.08);
}

.window-bar {
	height: 38px;
	display: flex;
	align-items: center;
	gap: 7px;
	padding: 0 14px;
	border-bottom: 1px solid rgba(70, 130, 185, 0.28);
	background: rgba(2, 10, 22, 0.42);

	i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #28d7ff;
		box-shadow: 0 0 12px rgba(40, 215, 255, 0.48);
	}
}

.app-body {
	height: calc(100% - 38px);
	display: grid;
	grid-template-columns: 116px 1fr;

	aside {
		display: grid;
		align-content: start;
		gap: 14px;
		padding: 20px 12px;
		border-right: 1px solid rgba(70, 130, 185, 0.24);
		background: rgba(4, 17, 35, 0.54);

		span {
			height: 36px;
			border: 1px solid rgba(51, 181, 255, 0.32);
			border-radius: 8px;
			background: rgba(14, 72, 128, 0.34);
		}
	}

	section {
		display: grid;
		grid-template-rows: 46px 86px 1fr;
		gap: 14px;
		padding: 18px;
	}
}

.search-line,
.banner-line,
.card-grid span {
	border: 1px solid rgba(49, 170, 255, 0.34);
	border-radius: 8px;
	background: rgba(7, 35, 73, 0.66);
}

.banner-line {
	position: relative;
	display: flex;
	align-items: end;
	justify-content: center;
	gap: 12px;
	overflow: hidden;

	b {
		width: 44px;
		height: 44px;
		border: 1px solid rgba(59, 231, 255, 0.72);
		background: linear-gradient(145deg, rgba(33, 210, 255, 0.38), rgba(8, 62, 136, 0.28));
		box-shadow: 0 0 24px rgba(29, 166, 255, 0.28);
		transform: translateY(10px) skewY(-8deg);
	}
}

.card-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;
}

.orbit {
	position: absolute;
	border: 1px solid rgba(48, 217, 255, 0.24);
	border-radius: 50%;
	transform: rotateX(64deg);
}

.orbit.one {
	width: 92%;
	height: 180px;
	bottom: 36px;
}

.orbit.two {
	width: 68%;
	height: 126px;
	bottom: 62px;
}

.platforms {
	position: relative;
	z-index: 1;
	width: min(1180px, calc(100% - 40px));
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16px;
	margin: 0 auto 42px;
}

.platform-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	padding: 20px;
	border: 1px solid rgba(42, 145, 225, 0.42);
	border-radius: 8px;
	background: rgba(5, 23, 49, 0.72);
	box-shadow: inset 0 0 28px rgba(0, 136, 255, 0.08);

	div {
		min-width: 0;
	}

	h2 {
		margin-top: 10px;
		color: #f1f8ff;
		font-size: 21px;
		font-weight: 800;
	}

	p {
		margin-top: 6px;
		color: #8fa7cc;
		font-size: 14px;
		line-height: 1.6;
	}

	a {
		flex: 0 0 auto;
		min-width: 150px;
		height: 42px;
		display: grid;
		place-items: center;
		border: 1px solid rgba(36, 207, 255, 0.42);
		border-radius: 8px;
		background: rgba(6, 29, 61, 0.68);
		color: #52dbff;
		text-decoration: none;
		font-size: 14px;
		font-weight: 760;
	}
}

.platform-card.active {
	border-color: rgba(36, 207, 255, 0.76);
	box-shadow:
		inset 0 0 28px rgba(0, 136, 255, 0.12),
		0 0 26px rgba(0, 149, 255, 0.18);
}

.platform-icon {
	width: 48px;
	height: 48px;
	display: grid;
	place-items: center;
	border: 1px solid rgba(53, 218, 255, 0.5);
	border-radius: 8px;
	background: rgba(9, 51, 100, 0.72);
	color: #61efff;
	font-size: 13px;
	font-weight: 900;
}

.disabled {
	cursor: not-allowed;
	opacity: 0.52;
}

a:not(.disabled):hover {
	border-color: rgba(60, 221, 255, 0.78);
	color: #ecfbff;
}

@media (max-width: 980px) {
	.download-header,
	.hero,
	.platforms {
		width: min(100% - 28px, 720px);
	}

	.hero {
		grid-template-columns: 1fr;
		min-height: auto;
	}

	.product-stage {
		min-height: 320px;
	}

	.platforms {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 620px) {
	.download-header,
	.platform-jump,
	.platform-card {
		align-items: stretch;
		flex-direction: column;
	}

	.platform-jump {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.primary-download,
	.platform-card a {
		width: 100%;
	}

	.app-body {
		grid-template-columns: 72px 1fr;
	}
}
</style>
