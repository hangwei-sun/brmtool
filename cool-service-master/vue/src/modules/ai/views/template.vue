<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-select :options="options.category" prop="category" :width="130" placeholder="分类" />
			<cl-select :options="options.status" prop="status" :width="120" placeholder="状态" />
			<cl-search-key placeholder="搜索模板标题、说明、提示词" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert">
			<template #slot-tags="{ scope }">
				<el-input v-model="scope.tagsText" placeholder="多个标签用英文逗号分隔" />
			</template>
		</cl-upsert>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'ai-template'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { ElMessage } from 'element-plus';
import { reactive } from 'vue';
import { BaseService } from '/@/cool/service';

const aiTemplateService = new BaseService('admin/ai/template');

const options = reactive({
	category: [
		{ label: '发现', value: 'discover', type: 'success' },
		{ label: '短片', value: 'short', type: 'warning' },
		{ label: '活动', value: 'activity', type: 'info' }
	],
	status: [
		{ label: '禁用', value: 0, type: 'danger' },
		{ label: '启用', value: 1, type: 'success' }
	]
});

const Table = useTable({
	columns: [
		{ type: 'selection', width: 60 },
		{ label: '标题', prop: 'title', minWidth: 180, showOverflowTooltip: true },
		{ label: '分类', prop: 'category', width: 110, dict: options.category },
		{ label: '描述', prop: 'description', minWidth: 220, showOverflowTooltip: true },
		{ label: '使用次数', prop: 'useCount', width: 100, sortable: 'custom' },
		{ label: '排序', prop: 'sort', width: 90, sortable: 'custom' },
		{ label: '状态', prop: 'status', width: 90, dict: options.status },
		{ label: '更新时间', prop: 'updateTime', minWidth: 170, sortable: 'custom' },
		{ type: 'op', width: 160 }
	]
});

const Upsert = useUpsert({
	dialog: {
		width: '900px'
	},
	props: {
		labelWidth: '100px'
	},
	items: [
		{
			label: '标题',
			prop: 'title',
			required: true,
			component: { name: 'el-input', props: { maxlength: 120 } }
		},
		{
			label: '分类',
			prop: 'category',
			span: 12,
			value: 'discover',
			component: { name: 'el-select', options: options.category }
		},
		{
			label: '封面图',
			prop: 'cover',
			span: 12,
			component: { name: 'el-input', props: { placeholder: '可选图片 URL' } }
		},
		{
			label: '描述',
			prop: 'description',
			component: { name: 'el-input', props: { type: 'textarea', rows: 3 } }
		},
		{
			label: '提示词',
			prop: 'prompt',
			required: true,
			component: { name: 'el-input', props: { type: 'textarea', rows: 8 } }
		},
		{
			label: '标签',
			prop: 'tagsText',
			component: { name: 'slot-tags' }
		},
		{
			label: '排序',
			prop: 'sort',
			span: 8,
			value: 0,
			component: { name: 'el-input-number', props: { min: 0, precision: 0 } }
		},
		{
			label: '状态',
			prop: 'status',
			span: 8,
			value: 1,
			component: { name: 'el-radio-group', options: options.status }
		}
	],
	onOpened(data) {
		data.tagsText = Array.isArray(data.tags) ? data.tags.join(',') : '';
	},
	onSubmit(data, { next }) {
		if (!data.prompt?.trim()) {
			ElMessage.error('提示词不能为空');
			return;
		}

		next({
			...data,
			tags: data.tagsText
				? data.tagsText
						.split(',')
						.map((e: string) => e.trim())
						.filter(Boolean)
				: [],
			tagsText: undefined
		});
	}
});

const Crud = useCrud(
	{
		service: aiTemplateService
	},
	app => {
		app.refresh();
	}
);
</script>
