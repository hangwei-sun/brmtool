<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-select :options="options.level" prop="level" :width="120" placeholder="等级" />
			<cl-select :options="options.targetType" prop="targetType" :width="130" placeholder="目标" />
			<cl-select :options="options.status" prop="status" :width="120" placeholder="状态" />
			<cl-search-key placeholder="搜索标题或内容" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert">
			<template #slot-target-users="{ scope }">
				<el-input
					v-model="scope.targetUserIdsText"
					placeholder="指定用户 ID，多个用英文逗号分隔"
					clearable
				/>
			</template>
		</cl-upsert>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'message-info'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { ElMessage } from 'element-plus';
import { reactive } from 'vue';
import { useCool } from '/@/cool';

const { service } = useCool();

const options = reactive({
	level: [
		{ label: '普通', value: 'info', type: 'info' },
		{ label: '成功', value: 'success', type: 'success' },
		{ label: '提醒', value: 'warning', type: 'warning' },
		{ label: '重要', value: 'error', type: 'danger' }
	],
	targetType: [
		{ label: '全体用户', value: 'all', type: 'success' },
		{ label: '指定用户', value: 'user', type: 'warning' }
	],
	actionType: [
		{ label: '无跳转', value: 'none', type: 'info' },
		{ label: '工具', value: 'tool', type: 'success' },
		{ label: '链接', value: 'link', type: 'warning' }
	],
	status: [
		{ label: '草稿', value: 0, type: 'info' },
		{ label: '发布', value: 1, type: 'success' },
		{ label: '下线', value: 2, type: 'danger' }
	]
});

const Table = useTable({
	columns: [
		{
			type: 'selection',
			width: 60
		},
		{
			label: '标题',
			prop: 'title',
			minWidth: 180,
			showOverflowTooltip: true
		},
		{
			label: '等级',
			prop: 'level',
			width: 100,
			dict: options.level
		},
		{
			label: '目标',
			prop: 'targetType',
			width: 110,
			dict: options.targetType
		},
		{
			label: '跳转',
			prop: 'actionType',
			width: 100,
			dict: options.actionType
		},
		{
			label: '发布时间',
			prop: 'publishTime',
			minWidth: 170,
			sortable: 'custom'
		},
		{
			label: '状态',
			prop: 'status',
			width: 100,
			dict: options.status
		},
		{
			label: '排序',
			prop: 'sort',
			width: 90,
			sortable: 'custom'
		},
		{
			type: 'op',
			width: 160
		}
	]
});

const Upsert = useUpsert({
	dialog: {
		width: '820px'
	},
	props: {
		labelWidth: '100px'
	},
	items: [
		{
			label: '标题',
			prop: 'title',
			required: true,
			component: {
				name: 'el-input',
				props: {
					maxlength: 120
				}
			}
		},
		{
			label: '内容',
			prop: 'content',
			required: true,
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 5
				}
			}
		},
		{
			label: '等级',
			prop: 'level',
			span: 12,
			value: 'info',
			component: {
				name: 'el-select',
				options: options.level
			}
		},
		{
			label: '目标',
			prop: 'targetType',
			span: 12,
			value: 'all',
			component: {
				name: 'el-select',
				options: options.targetType
			}
		},
		{
			label: '指定用户',
			prop: 'targetUserIdsText',
			component: {
				name: 'slot-target-users'
			}
		},
		{
			label: '跳转类型',
			prop: 'actionType',
			span: 12,
			value: 'none',
			component: {
				name: 'el-select',
				options: options.actionType
			}
		},
		{
			label: '跳转值',
			prop: 'actionValue',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					placeholder: '工具ID、工具编码或 https 链接'
				}
			}
		},
		{
			label: '发布时间',
			prop: 'publishTime',
			span: 12,
			component: {
				name: 'el-date-picker',
				props: {
					type: 'datetime',
					valueFormat: 'YYYY-MM-DD HH:mm:ss',
					placeholder: '为空则立即可见'
				}
			}
		},
		{
			label: '状态',
			prop: 'status',
			span: 12,
			value: 0,
			component: {
				name: 'el-radio-group',
				options: options.status
			}
		},
		{
			label: '排序',
			prop: 'sort',
			span: 12,
			value: 0,
			component: {
				name: 'el-input-number',
				props: {
					min: 0,
					precision: 0
				}
			}
		},
		{
			label: '备注',
			prop: 'remark',
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 2
				}
			}
		}
	],
	onOpened(data) {
		data.targetUserIdsText = Array.isArray(data.targetUserIds)
			? data.targetUserIds.join(',')
			: '';
	},
	onSubmit(data, { next }) {
		const targetUserIds = data.targetUserIdsText
			? data.targetUserIdsText
					.split(',')
					.map((e: string) => Number(e.trim()))
					.filter((e: number) => Number.isInteger(e) && e > 0)
			: [];

		if (data.targetType === 'user' && targetUserIds.length === 0) {
			ElMessage.error('指定用户消息需要填写用户ID');
			return;
		}

		next({
			...data,
			targetUserIds,
			targetUserIdsText: undefined
		});
	}
});

const Crud = useCrud(
	{
		service: (service as any).message.info
	},
	app => {
		app.refresh();
	}
);
</script>
