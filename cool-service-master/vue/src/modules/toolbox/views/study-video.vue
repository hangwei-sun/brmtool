<template>
	<div class="study-video-page">
		<div class="study-page-head">
			<div>
				<h2>学习入库</h2>
				<p>维护桌面端学习页的视频课程、封面、分类、推荐与上下架状态。</p>
			</div>
			<el-button type="primary" :loading="loading" @click="refreshAll">
				刷新分类与列表
			</el-button>
		</div>

		<div class="study-toolbar">
			<el-button @click="loadPage">刷新</el-button>
			<el-button type="primary" @click="openAdd">新增</el-button>
			<el-button type="danger" :disabled="selectedIds.length === 0" @click="deleteSelected">
				删除
			</el-button>
			<div class="toolbar-spacer" />
			<el-select v-model="query.category" clearable placeholder="分类" style="width: 150px">
				<el-option
					v-for="item in studyCategoryOptions"
					:key="item.value"
					:label="item.label"
					:value="item.value"
				/>
			</el-select>
			<el-select v-model="query.isRecommend" clearable placeholder="推荐" style="width: 120px">
				<el-option label="否" :value="0" />
				<el-option label="是" :value="1" />
			</el-select>
			<el-select v-model="query.isHot" clearable placeholder="热门" style="width: 120px">
				<el-option label="否" :value="0" />
				<el-option label="是" :value="1" />
			</el-select>
			<el-select v-model="query.status" clearable placeholder="状态" style="width: 120px">
				<el-option label="禁用" :value="0" />
				<el-option label="启用" :value="1" />
			</el-select>
			<el-input
				v-model="query.keyWord"
				clearable
				placeholder="搜索标题、简介、作者"
				style="width: 260px"
				@keyup.enter="search"
			/>
			<el-button type="primary" @click="search">搜索</el-button>
			<el-button @click="resetSearch">重置</el-button>
		</div>

		<el-table
			v-loading="loading"
			:data="videoList"
			border
			row-key="id"
			class="study-table"
			@selection-change="onSelectionChange"
		>
			<el-table-column type="selection" width="56" align="center" />
			<el-table-column label="封面" width="124" align="center">
				<template #default="{ row }">
					<el-image
						v-if="row.coverUrl"
						class="cover-thumb"
						:src="row.coverUrl"
						fit="cover"
						:preview-src-list="[row.coverUrl]"
						preview-teleported
					/>
					<span v-else class="cover-empty">无封面</span>
				</template>
			</el-table-column>
			<el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
			<el-table-column label="分类" width="130">
				<template #default="{ row }">{{ categoryName(row.category) }}</template>
			</el-table-column>
			<el-table-column prop="duration" label="时长" width="100" />
			<el-table-column prop="author" label="作者" width="130" show-overflow-tooltip />
			<el-table-column prop="viewCount" label="播放量" width="110" sortable />
			<el-table-column label="推荐" width="90" align="center">
				<template #default="{ row }">
					<el-tag :type="row.isRecommend ? 'success' : 'info'">
						{{ row.isRecommend ? '是' : '否' }}
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column label="热门" width="90" align="center">
				<template #default="{ row }">
					<el-tag :type="row.isHot ? 'success' : 'info'">{{ row.isHot ? '是' : '否' }}</el-tag>
				</template>
			</el-table-column>
			<el-table-column prop="sort" label="排序" width="90" sortable />
			<el-table-column label="状态" width="90" align="center">
				<template #default="{ row }">
					<el-tag :type="row.status ? 'success' : 'danger'">
						{{ row.status ? '启用' : '禁用' }}
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column label="操作" width="160" fixed="right" align="center">
				<template #default="{ row }">
					<el-button link type="primary" @click="openEdit(row)">编辑</el-button>
					<el-button link type="danger" @click="deleteRow(row)">删除</el-button>
				</template>
			</el-table-column>
		</el-table>

		<div class="study-pagination">
			<el-pagination
				v-model:current-page="query.page"
				v-model:page-size="query.size"
				:total="total"
				:page-sizes="[10, 20, 30, 40, 50, 100]"
				layout="total, sizes, prev, pager, next, jumper"
				@size-change="loadPage"
				@current-change="loadPage"
			/>
		</div>

		<el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑视频' : '新增视频'" width="920px">
			<el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
				<el-row :gutter="16">
					<el-col :span="24">
						<el-form-item label="标题" prop="title">
							<el-input v-model="form.title" maxlength="160" show-word-limit />
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="分类" prop="category">
							<el-select v-model="form.category" filterable placeholder="请选择分类">
								<el-option
									v-for="item in studyCategoryOptions"
									:key="item.value"
									:label="item.label"
									:value="item.value"
								/>
							</el-select>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="作者">
							<el-input v-model="form.author" maxlength="80" />
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="封面 URL">
							<el-input v-model="form.coverUrl" placeholder="可输入 https://example.com/cover.jpg" />
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="上传封面">
							<cl-upload v-model="form.coverUpload" :size="[136, 76]" :limit="1" text="本地上传封面" />
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="视频 URL">
							<el-input v-model="form.videoUrl" placeholder="可输入 https://example.com/video.mp4" />
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="上传视频">
							<cl-upload
								v-model="form.videoUpload"
								type="file"
								accept="video/*"
								:limit="1"
								text="本地上传视频"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="8">
						<el-form-item label="时长">
							<el-input v-model="form.duration" placeholder="12:45" maxlength="20" />
						</el-form-item>
					</el-col>
					<el-col :span="8">
						<el-form-item label="播放量">
							<el-input-number v-model="form.viewCount" :min="0" :precision="0" />
						</el-form-item>
					</el-col>
					<el-col :span="8">
						<el-form-item label="发布时间">
							<el-date-picker
								v-model="form.publishTime"
								type="datetime"
								value-format="YYYY-MM-DD HH:mm:ss"
								placeholder="选择发布时间"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="8">
						<el-form-item label="推荐">
							<el-radio-group v-model="form.isRecommend">
								<el-radio-button :label="0">否</el-radio-button>
								<el-radio-button :label="1">是</el-radio-button>
							</el-radio-group>
						</el-form-item>
					</el-col>
					<el-col :span="8">
						<el-form-item label="热门">
							<el-radio-group v-model="form.isHot">
								<el-radio-button :label="0">否</el-radio-button>
								<el-radio-button :label="1">是</el-radio-button>
							</el-radio-group>
						</el-form-item>
					</el-col>
					<el-col :span="8">
						<el-form-item label="状态">
							<el-radio-group v-model="form.status">
								<el-radio-button :label="0">禁用</el-radio-button>
								<el-radio-button :label="1">启用</el-radio-button>
							</el-radio-group>
						</el-form-item>
					</el-col>
					<el-col :span="8">
						<el-form-item label="排序">
							<el-input-number v-model="form.sort" :min="0" :precision="0" />
						</el-form-item>
					</el-col>
					<el-col :span="24">
						<el-form-item label="简介">
							<el-input v-model="form.description" type="textarea" :rows="4" maxlength="800" show-word-limit />
						</el-form-item>
					</el-col>
					<el-col :span="24">
						<el-form-item label="备注">
							<el-input v-model="form.remark" type="textarea" :rows="2" />
						</el-form-item>
					</el-col>
				</el-row>
			</el-form>
			<template #footer>
				<el-button @click="dialog.visible = false">取消</el-button>
				<el-button type="primary" :loading="dialog.saving" @click="submitForm">保存</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'toolbox-study-video'
});

import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useCool } from '/@/cool';

type StudyVideo = Eps.ToolboxStudyVideoEntity & {
	coverUpload?: string;
	videoUpload?: string;
};

const { service } = useCool();
const formRef = ref<FormInstance>();
const loading = ref(false);
const videoList = ref<StudyVideo[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const studyCategoryOptions = ref<{ label: string; value: string }[]>([]);

const query = reactive({
	page: 1,
	size: 20,
	category: '',
	isRecommend: '' as '' | number,
	isHot: '' as '' | number,
	status: '' as '' | number,
	keyWord: ''
});

const dialog = reactive({
	visible: false,
	isEdit: false,
	saving: false
});

const form = reactive<StudyVideo>(defaultForm());

const rules: FormRules = {
	title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
	category: [{ required: true, message: '请选择分类', trigger: 'change' }]
};

function defaultForm(): StudyVideo {
	return {
		title: '',
		category: '',
		description: '',
		coverUrl: '',
		videoUrl: '',
		duration: '',
		author: '',
		viewCount: 0,
		publishTime: '',
		isRecommend: 0,
		isHot: 0,
		sort: 0,
		status: 1,
		remark: '',
		coverUpload: '',
		videoUpload: ''
	};
}

async function loadPage() {
	loading.value = true;

	try {
		const res = await service.toolbox.studyVideo.page(cleanQuery(query));
		videoList.value = res.list || [];
		total.value = res.pagination?.total || 0;
	} catch (err: any) {
		ElMessage.error(err.message || '学习视频列表加载失败');
		videoList.value = [];
		total.value = 0;
	} finally {
		loading.value = false;
	}
}

async function refreshStudyCategories() {
	const list = await service.toolbox.studyCategory.list({
		status: 1,
		page: 1,
		size: 999
	});

	studyCategoryOptions.value = (list || []).map((item: any) => ({
		label: item.name,
		value: item.code
	}));
}

async function refreshAll() {
	await refreshStudyCategories();
	await loadPage();
}

function search() {
	query.page = 1;
	void loadPage();
}

function resetSearch() {
	query.page = 1;
	query.category = '';
	query.isRecommend = '';
	query.isHot = '';
	query.status = '';
	query.keyWord = '';
	void loadPage();
}

function openAdd() {
	dialog.isEdit = false;
	Object.assign(form, defaultForm(), {
		category: studyCategoryOptions.value[0]?.value || ''
	});
	dialog.visible = true;
}

function openEdit(row: StudyVideo) {
	dialog.isEdit = true;
	Object.assign(form, defaultForm(), row, {
		coverUpload: '',
		videoUpload: ''
	});
	dialog.visible = true;
}

async function submitForm() {
	await formRef.value?.validate();

	const coverUpload = firstUploadUrl(form.coverUpload);
	const videoUpload = firstUploadUrl(form.videoUpload);
	const payload: StudyVideo = {
		...form,
		coverUrl: coverUpload || form.coverUrl || '',
		videoUrl: videoUpload || form.videoUrl || ''
	};

	delete payload.coverUpload;
	delete payload.videoUpload;

	dialog.saving = true;
	try {
		if (dialog.isEdit) {
			await service.toolbox.studyVideo.update(payload);
		} else {
			delete payload.id;
			await service.toolbox.studyVideo.add(payload);
		}

		ElMessage.success('保存成功');
		dialog.visible = false;
		await loadPage();
	} catch (err: any) {
		ElMessage.error(err.message || '保存失败');
	} finally {
		dialog.saving = false;
	}
}

function onSelectionChange(list: StudyVideo[]) {
	selectedIds.value = list.map(item => Number(item.id)).filter(Boolean);
}

function deleteSelected() {
	void deleteVideos(selectedIds.value);
}

function deleteRow(row: StudyVideo) {
	void deleteVideos([Number(row.id)]);
}

async function deleteVideos(ids: number[]) {
	if (!ids.length) return;

	await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条学习视频吗？`, '提示', {
		type: 'warning'
	}).catch(() => null);

	try {
		await service.toolbox.studyVideo.delete({ ids });
		ElMessage.success('删除成功');
		selectedIds.value = [];
		await loadPage();
	} catch (err: any) {
		ElMessage.error(err.message || '删除失败');
	}
}

function cleanQuery(params: typeof query) {
	const data: Record<string, any> = {
		page: params.page,
		size: params.size,
		category: params.category,
		isRecommend: params.isRecommend,
		isHot: params.isHot,
		status: params.status,
		keyWord: params.keyWord
	};

	for (const key of Object.keys(data)) {
		if (data[key] === '' || data[key] === undefined || data[key] === null) {
			delete data[key];
		}
	}

	return data;
}

function firstUploadUrl(value: unknown): string {
	if (Array.isArray(value)) {
		return value.map(firstUploadUrl).find(Boolean) || '';
	}

	if (typeof value === 'string') {
		return value;
	}

	if (value && typeof value === 'object') {
		const data = value as Record<string, any>;
		return data.url || data.response?.url || data.response?.data || data.data?.url || '';
	}

	return '';
}

function categoryName(code?: string) {
	return studyCategoryOptions.value.find(item => item.value === code)?.label || code || '-';
}

onMounted(async () => {
	await refreshStudyCategories();
	await loadPage();
});
</script>

<style lang="scss" scoped>
.study-video-page {
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding: 16px;
}

.study-page-head {
	box-sizing: border-box;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 16px 18px;
	border: 1px solid var(--el-border-color-lighter);
	border-radius: 8px;
	background:
		linear-gradient(135deg, rgba(64, 158, 255, 0.12), rgba(103, 194, 58, 0.06)),
		var(--el-bg-color);

	h2 {
		margin: 0;
		color: var(--el-text-color-primary);
		font-size: 18px;
		font-weight: 700;
	}

	p {
		margin: 6px 0 0;
		color: var(--el-text-color-secondary);
		font-size: 13px;
	}
}

.study-toolbar {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.toolbar-spacer {
	flex: 1;
}

.study-table {
	width: 100%;
}

.study-pagination {
	display: flex;
	justify-content: flex-end;
}

.cover-thumb {
	width: 84px;
	height: 48px;
	border-radius: 6px;
	overflow: hidden;
	background: #0f172a;
}

.cover-empty {
	color: var(--el-text-color-secondary);
	font-size: 12px;
}
</style>
