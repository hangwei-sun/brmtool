<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-select :options="options.status" prop="status" :width="120" placeholder="状态" />
			<cl-search-key placeholder="搜索学习分类名称、编码" />
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
	name: 'toolbox-study-category'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { reactive } from 'vue';
import { useCool } from '/@/cool';

const { service } = useCool();

const options = reactive({
	status: [
		{ label: '禁用', value: 0, type: 'danger' },
		{ label: '启用', value: 1, type: 'success' }
	]
});

const Table = useTable({
	columns: [
		{ type: 'selection', width: 60 },
		{ label: '分类名称', prop: 'name', minWidth: 160 },
		{ label: '分类编码', prop: 'code', minWidth: 160, showOverflowTooltip: true },
		{ label: '排序', prop: 'sort', width: 100, sortable: 'custom' },
		{ label: '状态', prop: 'status', width: 100, dict: options.status },
		{ label: '备注', prop: 'remark', minWidth: 220, showOverflowTooltip: true },
		{ label: '创建时间', prop: 'createTime', minWidth: 170, sortable: 'custom' },
		{ type: 'op' }
	]
});

const Upsert = useUpsert({
	dialog: {
		width: '560px'
	},
	props: {
		labelWidth: '90px'
	},
	items: [
		{
			label: '分类名称',
			prop: 'name',
			required: true,
			component: {
				name: 'el-input',
				props: { maxlength: 50, placeholder: '例如：前端开发' }
			}
		},
		{
			label: '分类编码',
			prop: 'code',
			required: true,
			component: {
				name: 'el-input',
				props: { maxlength: 50, placeholder: '例如：frontend' }
			}
		},
		{
			label: '排序',
			prop: 'sort',
			value: 0,
			component: {
				name: 'el-input-number',
				props: { min: 0, precision: 0 }
			}
		},
		{
			label: '状态',
			prop: 'status',
			value: 1,
			component: {
				name: 'el-radio-group',
				options: options.status
			}
		},
		{
			label: '备注',
			prop: 'remark',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 3 }
			}
		}
	]
});

const Crud = useCrud(
	{
		service: service.toolbox.studyCategory
	},
	app => {
		app.refresh();
	}
);
</script>
