<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-select :options="options.status" prop="status" :width="130" placeholder="处理状态" />
			<cl-search-key placeholder="搜索标题、内容、用户、手机号" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert" />
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'toolbox-feedback'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { reactive } from 'vue';
import { useCool } from '/@/cool';

const { service } = useCool();

const options = reactive({
	status: [
		{ label: '待处理', value: 0, type: 'warning' },
		{ label: '已处理', value: 1, type: 'success' }
	]
});

const Table = useTable({
	columns: [
		{
			type: 'selection',
			width: 60
		},
		{
			label: '用户ID',
			prop: 'userId',
			width: 90
		},
		{
			label: '用户',
			prop: 'userName',
			minWidth: 120,
			showOverflowTooltip: true
		},
		{
			label: '手机号',
			prop: 'phone',
			minWidth: 130
		},
		{
			label: '标题',
			prop: 'title',
			minWidth: 180,
			showOverflowTooltip: true
		},
		{
			label: '内容',
			prop: 'content',
			minWidth: 240,
			showOverflowTooltip: true
		},
		{
			label: '联系方式',
			prop: 'contact',
			minWidth: 150,
			showOverflowTooltip: true
		},
		{
			label: '状态',
			prop: 'status',
			width: 100,
			dict: options.status
		},
		{
			label: '提交时间',
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc'
		},
		{
			type: 'op',
			width: 160,
			buttons: ['edit', 'delete']
		}
	]
});

const Upsert = useUpsert({
	dialog: {
		width: '760px'
	},
	props: {
		labelWidth: '100px'
	},
	items: [
		{
			label: '标题',
			prop: 'title',
			component: {
				name: 'el-input',
				props: {
					disabled: true
				}
			}
		},
		{
			label: '内容',
			prop: 'content',
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 5,
					disabled: true
				}
			}
		},
		{
			label: '联系方式',
			prop: 'contact',
			component: {
				name: 'el-input',
				props: {
					disabled: true
				}
			}
		},
		{
			label: '处理状态',
			prop: 'status',
			value: 0,
			component: {
				name: 'el-radio-group',
				options: options.status
			}
		},
		{
			label: '处理备注',
			prop: 'reply',
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 4,
					placeholder: '记录处理结果或备注'
				}
			}
		}
	]
});

const Crud = useCrud(
	{
		service: (service as any).toolbox.feedback
	},
	app => {
		app.refresh();
	}
);
</script>
