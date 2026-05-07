<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-select :options="options.provider" prop="provider" :width="120" placeholder="供应商" />
			<cl-select :options="options.capability" prop="capability" :width="140" placeholder="能力" />
			<cl-select :options="options.status" prop="status" :width="120" placeholder="状态" />
			<cl-select :options="options.yesNo" prop="isDefault" :width="120" placeholder="默认" />
			<cl-search-key placeholder="搜索模型名称、ID、说明" />
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
	name: 'ai-model'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { reactive } from 'vue';
import { BaseService } from '/@/cool/service';

const aiModelService = new BaseService('admin/ai/model');

const options = reactive({
	provider: [
		{ label: 'DeepSeek', value: 'deepseek', type: 'success' },
		{ label: '火山引擎', value: 'volcengine', type: 'warning' }
	],
	capability: [
		{ label: '文本', value: 'text', type: 'success' },
		{ label: '图片', value: 'image', type: 'primary' },
		{ label: '音乐', value: 'audio_music', type: 'warning' },
		{ label: '语音', value: 'audio_speech', type: 'warning' },
		{ label: '视频', value: 'video', type: 'danger' }
	],
	yesNo: [
		{ label: '否', value: 0, type: 'info' },
		{ label: '是', value: 1, type: 'success' }
	],
	status: [
		{ label: '禁用', value: 0, type: 'danger' },
		{ label: '启用', value: 1, type: 'success' }
	]
});

const Table = useTable({
	columns: [
		{ type: 'selection', width: 60 },
		{ label: '展示名称', prop: 'name', minWidth: 160, showOverflowTooltip: true },
		{ label: '模型 ID', prop: 'modelId', minWidth: 180, showOverflowTooltip: true },
		{ label: '供应商', prop: 'provider', width: 110, dict: options.provider },
		{ label: '能力', prop: 'capability', width: 110, dict: options.capability },
		{ label: 'API Key', prop: 'apiKeyConfigured', width: 100, dict: options.yesNo },
		{ label: '默认', prop: 'isDefault', width: 90, dict: options.yesNo },
		{ label: 'Thinking', prop: 'thinkingDefault', width: 110, dict: options.yesNo },
		{ label: '排序', prop: 'sort', width: 90, sortable: 'custom' },
		{ label: '状态', prop: 'status', width: 90, dict: options.status },
		{ label: '更新时间', prop: 'updateTime', minWidth: 170, sortable: 'custom' },
		{ type: 'op', width: 160 }
	]
});

const Upsert = useUpsert({
	dialog: {
		width: '820px'
	},
	props: {
		labelWidth: '110px'
	},
	items: [
		{
			label: '供应商',
			prop: 'provider',
			span: 12,
			value: 'deepseek',
			required: true,
			component: { name: 'el-select', options: options.provider }
		},
		{
			label: '能力',
			prop: 'capability',
			span: 12,
			value: 'text',
			required: true,
			component: { name: 'el-select', options: options.capability }
		},
		{
			label: '模型 ID',
			prop: 'modelId',
			span: 12,
			required: true,
			component: {
				name: 'el-input',
				props: {
					placeholder: '如 doubao-seedream-5-0-260128；或填写控制台 endpoint ID'
				}
			}
		},
		{
			label: 'Base URL',
			prop: 'apiBaseUrl',
			component: {
				name: 'el-input',
				props: { placeholder: '如 https://ark.cn-beijing.volces.com/api/v3' }
			}
		},
		{
			label: '生成路径',
			prop: 'apiPath',
			component: {
				name: 'el-input',
				props: { placeholder: '如 /images/generations 或 /contents/generations/tasks' }
			}
		},
		{
			label: '查询路径',
			prop: 'apiTaskPath',
			component: {
				name: 'el-input',
				props: { placeholder: '异步任务填写，如 /contents/generations/tasks/{taskId}' }
			}
		},
		{
			label: '展示名称',
			prop: 'name',
			span: 12,
			required: true,
			component: { name: 'el-input', props: { maxlength: 80 } }
		},
		{
			label: 'API Key',
			prop: 'apiKey',
			component: {
				name: 'el-input',
				props: {
					type: 'password',
					showPassword: true,
					autocomplete: 'new-password',
					placeholder: '新增或替换密钥时填写；编辑留空则保持原密钥'
				}
			}
		},
		{
			label: '默认模型',
			prop: 'isDefault',
			span: 12,
			value: 0,
			component: { name: 'el-radio-group', options: options.yesNo }
		},
		{
			label: '默认 Thinking',
			prop: 'thinkingDefault',
			span: 12,
			value: 1,
			component: { name: 'el-radio-group', options: options.yesNo }
		},
		{
			label: '排序',
			prop: 'sort',
			span: 12,
			value: 0,
			component: { name: 'el-input-number', props: { min: 0, precision: 0 } }
		},
		{
			label: '状态',
			prop: 'status',
			span: 12,
			value: 1,
			component: { name: 'el-radio-group', options: options.status }
		},
		{
			label: '说明',
			prop: 'description',
			component: { name: 'el-input', props: { type: 'textarea', rows: 3 } }
		}
	],
	onOpened(data) {
		data.apiKey = '';
	}
});

const Crud = useCrud(
	{
		service: aiModelService
	},
	app => {
		app.refresh();
	}
);
</script>
