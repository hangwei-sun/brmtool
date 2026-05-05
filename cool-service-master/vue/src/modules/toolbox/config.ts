import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
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
			}
		]
	};
};
