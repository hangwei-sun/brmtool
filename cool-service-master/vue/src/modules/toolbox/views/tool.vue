<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-select :options="categoryOptions" prop="categoryId" :width="140" placeholder="分类" />
			<cl-select :options="options.type" prop="type" :width="150" placeholder="工具类型" />
			<cl-select
				:options="options.authRequired"
				prop="authRequired"
				:width="130"
				placeholder="访问权限"
			/>
			<cl-select :options="options.status" prop="status" :width="120" placeholder="状态" />
			<cl-search-key placeholder="搜索工具名称、编码、关键词" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert">
			<template #slot-entry="{ scope }">
				<el-input
					v-model="scope.entry"
					:placeholder="entryPlaceholder(scope.type)"
					clearable
				/>
			</template>

			<template #slot-config="{ scope }">
				<el-input v-model="scope.configText" type="textarea" :rows="6" />
			</template>
		</cl-upsert>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'toolbox-tool'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useCool } from '/@/cool';

const { service } = useCool();

const categoryOptions = ref<{ label: string; value: number }[]>([]);

const options = reactive({
	type: [
		{
			label: '外部链接',
			value: 'external_link',
			type: 'success'
		},
		{
			label: '内置工具',
			value: 'internal_web'
		},
		{
			label: '本地插件',
			value: 'local_plugin',
			type: 'warning'
		}
	],
	openMode: [
		{
			label: '系统浏览器',
			value: 'external_browser'
		},
		{
			label: '独立窗口',
			value: 'electron_window'
		},
		{
			label: '内嵌 WebView',
			value: 'embedded_webview'
		},
		{
			label: '内部路由',
			value: 'internal_route'
		}
	],
	status: [
		{
			label: '禁用',
			value: 0,
			type: 'danger'
		},
		{
			label: '启用',
			value: 1,
			type: 'success'
		}
	],
	yesNo: [
		{
			label: '否',
			value: 0,
			type: 'info'
		},
		{
			label: '是',
			value: 1,
			type: 'success'
		}
	],
	authRequired: [
		{
			label: '公开访问',
			value: 0,
			type: 'success'
		},
		{
			label: '登录后访问',
			value: 1,
			type: 'warning'
		}
	]
});

function entryPlaceholder(type?: string) {
	if (type === 'external_link') {
		return 'https://example.com';
	}

	if (type === 'local_plugin') {
		return '插件标识，第一阶段仅保存配置';
	}

	return '/tools/json-format';
}

async function refreshCategories() {
	const list = await service.toolbox.category.list({
		status: 1,
		page: 1,
		size: 999
	});

	categoryOptions.value = list.map((e: any) => ({
		label: e.name,
		value: e.id
	}));
}

const Table = useTable({
	columns: [
		{
			type: 'selection',
			width: 60
		},
		{
			label: '工具名称',
			prop: 'name',
			minWidth: 160
		},
		{
			label: '编码',
			prop: 'code',
			minWidth: 160,
			showOverflowTooltip: true
		},
		{
			label: '分类',
			prop: 'categoryId',
			minWidth: 120,
			dict: computed(() => categoryOptions.value)
		},
		{
			label: '类型',
			prop: 'type',
			minWidth: 120,
			dict: options.type
		},
		{
			label: '打开方式',
			prop: 'openMode',
			minWidth: 130,
			dict: options.openMode
		},
		{
			label: '入口',
			prop: 'entry',
			minWidth: 220,
			showOverflowTooltip: true
		},
		{
			label: '推荐',
			prop: 'isRecommend',
			width: 90,
			dict: options.yesNo
		},
		{
			label: '热门',
			prop: 'isHot',
			width: 90,
			dict: options.yesNo
		},
		{
			label: '最新',
			prop: 'isNew',
			width: 90,
			dict: options.yesNo
		},
		{
			label: '访问权限',
			prop: 'authRequired',
			width: 110,
			dict: options.authRequired
		},
		{
			label: '排序',
			prop: 'sort',
			width: 90,
			sortable: 'custom'
		},
		{
			label: '状态',
			prop: 'status',
			width: 90,
			dict: options.status
		},
		{
			type: 'op',
			width: 160
		}
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
			label: '工具名称',
			prop: 'name',
			span: 12,
			required: true,
			component: {
				name: 'el-input',
				props: {
					maxlength: 80
				}
			}
		},
		{
			label: '工具编码',
			prop: 'code',
			span: 12,
			required: true,
			component: {
				name: 'el-input',
				props: {
					maxlength: 80,
					placeholder: '例如：json-format'
				}
			}
		},
		{
			label: '分类',
			prop: 'categoryId',
			span: 12,
			required: true,
			component: {
				name: 'el-select',
				options: categoryOptions,
				props: {
					filterable: true
				}
			}
		},
		{
			label: '类型',
			prop: 'type',
			span: 12,
			value: 'internal_web',
			required: true,
			component: {
				name: 'el-select',
				options: options.type
			}
		},
		{
			label: '打开方式',
			prop: 'openMode',
			span: 12,
			value: 'internal_route',
			required: true,
			component: {
				name: 'el-select',
				options: options.openMode
			}
		},
		{
			label: '图标',
			prop: 'icon',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					placeholder: '图标名称或 URL'
				}
			}
		},
		{
			label: '入口',
			prop: 'entry',
			required: true,
			component: {
				name: 'slot-entry'
			}
		},
		{
			label: '描述',
			prop: 'description',
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 3
				}
			}
		},
		{
			label: '标签',
			prop: 'tagsText',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					placeholder: '多个标签用英文逗号分隔'
				}
			}
		},
		{
			label: '关键词',
			prop: 'keywords',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					placeholder: '名称、拼音、首字母等'
				}
			}
		},
		{
			label: '推荐',
			prop: 'isRecommend',
			span: 8,
			value: 0,
			component: {
				name: 'el-radio-group',
				options: options.yesNo
			}
		},
		{
			label: '热门',
			prop: 'isHot',
			span: 8,
			value: 0,
			component: {
				name: 'el-radio-group',
				options: options.yesNo
			}
		},
		{
			label: '最新',
			prop: 'isNew',
			span: 8,
			value: 0,
			component: {
				name: 'el-radio-group',
				options: options.yesNo
			}
		},
		{
			label: '访问权限',
			prop: 'authRequired',
			span: 8,
			value: 0,
			component: {
				name: 'el-radio-group',
				options: options.authRequired
			}
		},
		{
			label: '排序',
			prop: 'sort',
			span: 8,
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
			label: '状态',
			prop: 'status',
			span: 8,
			value: 1,
			component: {
				name: 'el-radio-group',
				options: options.status
			}
		},
		{
			label: '版本',
			prop: 'version',
			span: 8,
			value: '1.0.0',
			component: {
				name: 'el-input'
			}
		},
		{
			label: '配置 JSON',
			prop: 'configText',
			component: {
				name: 'slot-config'
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
		data.tagsText = Array.isArray(data.tags) ? data.tags.join(',') : '';
		data.configText = JSON.stringify(data.config || {}, null, 2);
	},
	onSubmit(data, { next }) {
		let config = {};

		try {
			config = data.configText ? JSON.parse(data.configText) : {};
		} catch (error) {
			ElMessage.error('配置 JSON 格式不正确');
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
			config,
			tagsText: undefined,
			configText: undefined
		});
	}
});

const Crud = useCrud(
	{
		service: service.toolbox.tool
	},
	app => {
		app.refresh();
	}
);

onMounted(() => {
	refreshCategories();
});
</script>
