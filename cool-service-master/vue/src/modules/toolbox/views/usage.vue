<template>
	<div class="toolbox-usage">
		<div class="metrics">
			<div class="metric">
				<p class="label">今日打开</p>
				<p class="value">{{ stats.todayCount }}</p>
			</div>
			<div class="metric">
				<p class="label">累计打开</p>
				<p class="value">{{ stats.totalCount }}</p>
			</div>
			<div class="metric">
				<p class="label">热门工具数</p>
				<p class="value">{{ stats.popularTools.length }}</p>
			</div>
			<div class="metric">
				<p class="label">活跃用户数</p>
				<p class="value">{{ userStats.length }}</p>
			</div>
		</div>

		<div class="usage-panel">
			<div class="panel-head">
				<h3>所有用户使用统计</h3>
				<cl-export-btn
					filename="用户使用统计"
					:columns="userColumns"
					:data="exportUserStats"
				/>
			</div>
			<el-table :data="userStats" border stripe height="320">
				<el-table-column type="index" label="#" width="70" />
				<el-table-column prop="userId" label="用户ID" width="100" />
				<el-table-column prop="nickName" label="昵称" min-width="150" show-overflow-tooltip />
				<el-table-column prop="phone" label="手机号" min-width="140" />
				<el-table-column prop="count" label="累计使用" width="110" sortable />
				<el-table-column prop="todayCount" label="今日使用" width="110" sortable />
				<el-table-column prop="lastUseTime" label="最近使用时间" min-width="170" />
				<el-table-column label="操作" width="110" fixed="right">
					<template #default="{ row }">
						<el-button link type="primary" @click="openUserToolStats(row)">应用明细</el-button>
					</template>
				</el-table-column>
			</el-table>
		</div>

		<cl-crud ref="Crud">
			<cl-row>
				<cl-refresh-btn />
				<el-button @click="refreshStats">刷新统计</el-button>
				<cl-export-btn filename="工具使用明细" :columns="Table?.columns" />
				<cl-flex1 />
				<cl-search-key placeholder="搜索工具名称" />
			</cl-row>

			<cl-row>
				<cl-table ref="Table" />
			</cl-row>

			<cl-row>
				<cl-flex1 />
				<cl-pagination />
			</cl-row>
		</cl-crud>

		<el-dialog
			v-model="detail.visible"
			:title="`${detail.userName} 使用应用明细`"
			width="720px"
			append-to-body
		>
			<el-table v-loading="detail.loading" :data="detail.list" border stripe max-height="420">
				<el-table-column type="index" label="#" width="70" />
				<el-table-column prop="toolId" label="工具ID" width="100" />
				<el-table-column prop="toolName" label="应用/工具名称" min-width="180" show-overflow-tooltip />
				<el-table-column prop="count" label="使用次数" width="110" sortable />
				<el-table-column prop="todayCount" label="今日使用" width="110" sortable />
				<el-table-column prop="lastUseTime" label="最近使用时间" min-width="170" />
			</el-table>
			<template #footer>
				<el-button @click="detail.visible = false">关闭</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'toolbox-usage'
});

import { useCrud, useTable } from '@cool-vue/crud';
import { onMounted, reactive } from 'vue';
import { useCool } from '/@/cool';

const { service } = useCool();

const stats = reactive({
	todayCount: 0,
	totalCount: 0,
	popularTools: [] as any[]
});
const userStats = reactive<any[]>([]);
const detail = reactive({
	visible: false,
	loading: false,
	userId: 0,
	userName: '',
	list: [] as any[]
});
const userColumns = [
	{ label: '用户ID', prop: 'userId' },
	{ label: '昵称', prop: 'nickName' },
	{ label: '手机号', prop: 'phone' },
	{ label: '累计使用', prop: 'count' },
	{ label: '今日使用', prop: 'todayCount' },
	{ label: '最近使用时间', prop: 'lastUseTime' }
] as any[];

async function refreshStats() {
	const res = await service.toolbox.usage.stats();

	stats.todayCount = Number(res.todayCount || 0);
	stats.totalCount = Number(res.totalCount || 0);
	stats.popularTools = res.popularTools || [];
	userStats.splice(
		0,
		userStats.length,
		...(res.userStats || []).map(normalizeUserStat)
	);
}

async function exportUserStats() {
	const list = await service.toolbox.usage.userStats({
		limit: 1000
	});
	return (list || []).map(normalizeUserStat);
}

async function openUserToolStats(row: any) {
	const user = normalizeUserStat(row);

	detail.visible = true;
	detail.loading = true;
	detail.userId = user.userId;
	detail.userName = user.nickName;
	detail.list = [];

	try {
		const list = await service.toolbox.usage.userToolStats({
			userId: user.userId,
			limit: 1000
		});
		detail.list = (list || []).map(normalizeToolStat);
	} finally {
		detail.loading = false;
	}
}

function normalizeUserStat(row: any) {
	return {
		...row,
		userId: Number(row.userId || 0),
		count: Number(row.count || 0),
		todayCount: Number(row.todayCount || 0),
		nickName: row.nickName || (Number(row.userId || 0) === 0 ? '匿名用户' : '未命名用户')
	};
}

function normalizeToolStat(row: any) {
	return {
		...row,
		toolId: Number(row.toolId || 0),
		count: Number(row.count || 0),
		todayCount: Number(row.todayCount || 0)
	};
}

const Table = useTable({
	columns: [
		{
			label: '#',
			type: 'index',
			width: 70
		},
		{
			label: '用户ID',
			prop: 'userId',
			minWidth: 100
		},
		{
			label: '工具ID',
			prop: 'toolId',
			minWidth: 100
		},
		{
			label: '工具名称',
			prop: 'toolName',
			minWidth: 180,
			showOverflowTooltip: true
		},
		{
			label: '行为',
			prop: 'action',
			minWidth: 100
		},
		{
			label: '客户端',
			prop: 'clientType',
			minWidth: 120
		},
		{
			label: '创建时间',
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc'
		}
	]
});

const Crud = useCrud(
	{
		service: service.toolbox.usage
	},
	app => {
		app.refresh();
		refreshStats();
	}
);

onMounted(() => {
	refreshStats();
});
</script>

<style lang="scss" scoped>
.toolbox-usage {
	.metrics {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 12px;
	}

	.usage-panel {
		margin-bottom: 12px;
		padding: 14px;
		border: 1px solid var(--el-border-color-light);
		border-radius: 6px;
		background-color: var(--el-bg-color);
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;

		h3 {
			margin: 0;
			font-size: 16px;
			font-weight: 600;
		}
	}

	.metric {
		padding: 16px;
		border: 1px solid var(--el-border-color-light);
		border-radius: 6px;
		background-color: var(--el-bg-color);

		.label {
			margin: 0 0 8px;
			color: var(--el-text-color-secondary);
			font-size: 13px;
		}

		.value {
			margin: 0;
			color: var(--el-text-color-primary);
			font-size: 26px;
			font-weight: 600;
		}
	}
}
</style>
