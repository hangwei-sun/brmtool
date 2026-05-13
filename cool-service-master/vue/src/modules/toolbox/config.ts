import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		ignore: {
			token: ['/download', '/web']
		},
		views: [
			{
				meta: {
					label: '工具分类'
				},
				path: '/toolbox/category',
				component: () => import('./views/category.vue')
			},
			{
				meta: {
					label: '工具管理'
				},
				path: '/toolbox/tool',
				component: () => import('./views/tool.vue')
			},
			{
				meta: {
					label: '使用统计'
				},
				path: '/toolbox/usage',
				component: () => import('./views/usage.vue')
			},
			{
				meta: {
					label: '学习分类'
				},
				path: '/toolbox/study-category',
				component: () => import('./views/study-category.vue')
			},
			{
				meta: {
					label: '学习入库'
				},
				path: '/toolbox/study-video',
				component: () => import('./views/study-video.vue')
			},
			{
				meta: {
					label: '插件市场'
				},
				path: '/toolbox/plugin',
				component: () => import('./views/plugin.vue')
			},
			{
				meta: {
					label: '使用建议'
				},
				path: '/toolbox/feedback',
				component: () => import('./views/feedback.vue')
			}
		],
		pages: [
			{
				path: '/web',
				meta: {
					label: '数智工具箱 Web',
					process: false
				},
				component: () => import('./pages/web.vue')
			},
			{
				path: '/download',
				meta: {
					label: '桌面端下载',
					process: false
				},
				component: () => import('./pages/download.vue')
			}
		]
	};
};
