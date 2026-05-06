<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<el-button type="primary" @click="openUploadDialog">上传插件包</el-button>
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-select
				:options="options.reviewStatus"
				prop="reviewStatus"
				:width="120"
				placeholder="审核状态"
			/>
			<cl-select
				:options="options.publishStatus"
				prop="publishStatus"
				:width="120"
				placeholder="发布状态"
			/>
			<cl-select
				:options="options.installStatus"
				prop="installStatus"
				:width="120"
				placeholder="关联状态"
			/>
			<cl-search-key placeholder="搜索插件名称、编码、说明" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table">
				<template #slot-actions="{ scope }">
					<el-button text type="success" @click="publishPlugin(scope.row)">发布</el-button>
					<el-button text type="warning" @click="offlinePlugin(scope.row)">下线</el-button>
					<el-button text type="primary" @click="linkTool(scope.row)">关联工具</el-button>
				</template>
			</cl-table>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert">
			<template #slot-permissions="{ scope }">
				<el-select
					v-model="scope.permissions"
					multiple
					filterable
					clearable
					placeholder="选择插件权限"
				>
					<el-option
						v-for="item in options.permissions"
						:key="item.value"
						:label="item.label"
						:value="item.value"
					/>
				</el-select>
			</template>

			<template #slot-json="{ scope }">
				<el-input
					v-model="scope.pluginJsonText"
					type="textarea"
					:rows="8"
					placeholder='可粘贴 plugin.json，例如 {"code":"demo","name":"Demo","version":"1.0.0","entry":"https://..."}'
				/>
			</template>

			<template #slot-config="{ scope }">
				<el-input v-model="scope.configText" type="textarea" :rows="5" />
			</template>
		</cl-upsert>

		<el-dialog v-model="upload.visible" title="上传插件包" width="520px">
			<el-form label-width="96px">
				<el-form-item label="插件包">
					<el-upload
						:auto-upload="false"
						:limit="1"
						accept=".zip"
						:on-change="onPackageChange"
						:on-remove="onPackageRemove"
						drag
					>
						<el-icon class="el-icon--upload"><upload-filled /></el-icon>
						<div class="el-upload__text">拖拽 zip 到此处，或点击选择</div>
						<template #tip>
							<div class="el-upload__tip">
								根目录必须包含 plugin.json，入口文件默认 index.html。
							</div>
						</template>
					</el-upload>
				</el-form-item>

				<el-form-item label="插件编码">
					<el-input
						v-model="upload.code"
						clearable
						placeholder="更新已有插件时可填写，用于校验编码一致"
					/>
				</el-form-item>
			</el-form>

			<template #footer>
				<el-button @click="upload.visible = false">取消</el-button>
				<el-button type="primary" :loading="upload.loading" @click="submitPackageUpload">
					上传并解析
				</el-button>
			</template>
		</el-dialog>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'toolbox-plugin'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { reactive } from 'vue';
import { useCool } from '/@/cool';

const { service } = useCool();

const pluginService = (service as any).toolbox.plugin;

const options = reactive({
	reviewStatus: [
		{ label: '草稿', value: 0, type: 'info' },
		{ label: '已通过', value: 1, type: 'success' },
		{ label: '已拒绝', value: 2, type: 'danger' }
	],
	publishStatus: [
		{ label: '下线', value: 0, type: 'info' },
		{ label: '上线', value: 1, type: 'success' }
	],
	installStatus: [
		{ label: '未关联', value: 0, type: 'info' },
		{ label: '已关联', value: 1, type: 'success' }
	],
	permissions: [
		{ label: '访问工具箱 App API', value: 'network:app-api' },
		{ label: '插件私有存储', value: 'storage:plugin' },
		{ label: '只读通知状态', value: 'notification:readonly' }
	]
});

const upload = reactive({
	visible: false,
	loading: false,
	file: null as any,
	code: ''
});

async function callPluginAction(row: any, action: 'publish' | 'offline' | 'linkTool') {
	try {
		if (typeof pluginService[action] === 'function') {
			await pluginService[action]({ id: row.id });
		} else {
			await pluginService.request({
				url: `/${action}`,
				method: 'POST',
				data: { id: row.id }
			});
		}

		ElMessage.success('操作成功');
		Crud.value?.refresh();
	} catch (error) {
		ElMessage.error((error as Error).message || '操作失败');
	}
}

function publishPlugin(row: any) {
	callPluginAction(row, 'publish');
}

function offlinePlugin(row: any) {
	callPluginAction(row, 'offline');
}

function linkTool(row: any) {
	callPluginAction(row, 'linkTool');
}

function openUploadDialog() {
	upload.visible = true;
	upload.file = null;
	upload.code = '';
}

function onPackageChange(file: any) {
	upload.file = file;
}

function onPackageRemove() {
	upload.file = null;
}

async function submitPackageUpload() {
	const raw = upload.file?.raw;

	if (!raw) {
		ElMessage.warning('请选择插件 zip 包');
		return;
	}

	const data = new FormData();
	data.append('files', raw);

	if (upload.code) {
		data.append('code', upload.code);
	}

	upload.loading = true;
	try {
		await pluginService.request({
			url: '/uploadPackage',
			method: 'POST',
			data,
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		});
		ElMessage.success('插件包已解析，审核后可发布');
		upload.visible = false;
		Crud.value?.refresh();
	} catch (error) {
		ElMessage.error((error as Error).message || '上传失败');
	} finally {
		upload.loading = false;
	}
}

const Table = useTable({
	columns: [
		{ type: 'selection', width: 60 },
		{ label: '插件名称', prop: 'name', minWidth: 150 },
		{ label: '编码', prop: 'code', minWidth: 150, showOverflowTooltip: true },
		{ label: '版本', prop: 'version', width: 100 },
		{ label: '入口', prop: 'entry', minWidth: 260, showOverflowTooltip: true },
		{ label: '权限', prop: 'permissions', minWidth: 180, showOverflowTooltip: true },
		{ label: '审核', prop: 'reviewStatus', width: 100, dict: options.reviewStatus },
		{ label: '发布', prop: 'publishStatus', width: 100, dict: options.publishStatus },
		{ label: '工具关联', prop: 'installStatus', width: 100, dict: options.installStatus },
		{ label: '排序', prop: 'sort', width: 90, sortable: 'custom' },
		{ label: '更新时间', prop: 'updateTime', minWidth: 170, sortable: 'custom' },
		{ type: 'op', buttons: ['slot-actions', 'edit', 'delete'], width: 260 }
	]
});

const Upsert = useUpsert({
	dialog: {
		width: '920px'
	},
	props: {
		labelWidth: '110px'
	},
	items: [
		{
			label: '插件名称',
			prop: 'name',
			span: 12,
			required: true,
			component: { name: 'el-input', props: { maxlength: 80 } }
		},
		{
			label: '插件编码',
			prop: 'code',
			span: 12,
			required: true,
			component: {
				name: 'el-input',
				props: { maxlength: 80, placeholder: '例如：demo-plugin' }
			}
		},
		{
			label: '版本号',
			prop: 'version',
			span: 12,
			value: '1.0.0',
			required: true,
			component: { name: 'el-input' }
		},
		{
			label: '图标',
			prop: 'icon',
			span: 12,
			component: { name: 'el-input', props: { placeholder: 'PLG 或图片 URL' } }
		},
		{
			label: '入口地址',
			prop: 'entry',
			required: true,
			component: {
				name: 'el-input',
				props: { placeholder: 'https://... 或 /plugins/demo/index.html' }
			}
		},
		{
			label: '插件包地址',
			prop: 'packageUrl',
			component: {
				name: 'el-input',
				props: { placeholder: '/updates/plugins/demo-1.0.0.zip' }
			}
		},
		{
			label: 'checksum',
			prop: 'checksum',
			component: { name: 'el-input', props: { placeholder: 'sha256 校验值' } }
		},
		{
			label: '权限',
			prop: 'permissions',
			component: { name: 'slot-permissions' }
		},
		{
			label: '最低客户端',
			prop: 'minAppVersion',
			span: 12,
			component: { name: 'el-input', props: { placeholder: '例如：1.0.0' } }
		},
		{
			label: '排序',
			prop: 'sort',
			span: 12,
			value: 0,
			component: { name: 'el-input-number', props: { min: 0, precision: 0 } }
		},
		{
			label: '审核状态',
			prop: 'reviewStatus',
			span: 12,
			value: 0,
			component: { name: 'el-radio-group', options: options.reviewStatus }
		},
		{
			label: '发布状态',
			prop: 'publishStatus',
			span: 12,
			value: 0,
			component: { name: 'el-radio-group', options: options.publishStatus }
		},
		{
			label: '描述',
			prop: 'description',
			component: { name: 'el-input', props: { type: 'textarea', rows: 3 } }
		},
		{
			label: '更新说明',
			prop: 'changelog',
			component: { name: 'el-input', props: { type: 'textarea', rows: 3 } }
		},
		{
			label: 'plugin.json',
			prop: 'pluginJsonText',
			component: { name: 'slot-json' }
		},
		{
			label: '扩展配置',
			prop: 'configText',
			component: { name: 'slot-config' }
		},
		{
			label: '备注',
			prop: 'remark',
			component: { name: 'el-input', props: { type: 'textarea', rows: 2 } }
		}
	],
	onOpened(data) {
		data.permissions = Array.isArray(data.permissions) ? data.permissions : [];
		data.pluginJsonText = data.pluginJson ? JSON.stringify(data.pluginJson, null, 2) : '';
		data.configText = JSON.stringify(data.config || {}, null, 2);
	},
	onSubmit(data, { next }) {
		let pluginJson = {};
		let config = {};

		try {
			pluginJson = data.pluginJsonText ? JSON.parse(data.pluginJsonText) : {};
			config = data.configText ? JSON.parse(data.configText) : {};
		} catch (error) {
			ElMessage.error('plugin.json 或扩展配置不是合法 JSON');
			return;
		}

		next({
			...data,
			permissions: Array.isArray(data.permissions) ? data.permissions : [],
			pluginJson,
			config,
			pluginJsonText: undefined,
			configText: undefined
		});
	}
});

const Crud = useCrud(
	{
		service: pluginService
	},
	app => {
		app.refresh();
	}
);
</script>
