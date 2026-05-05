import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		views: [
			{
				meta: {
					label: '消息管理'
				},
				path: '/message/info',
				component: () => import('./views/info.vue')
			}
		]
	};
};
