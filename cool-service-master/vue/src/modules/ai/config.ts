import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		views: [
			{
				meta: {
					label: '模型管理'
				},
				path: '/ai/model',
				component: () => import('./views/model.vue')
			},
			{
				meta: {
					label: '模板管理'
				},
				path: '/ai/template',
				component: () => import('./views/template.vue')
			}
		]
	};
};
