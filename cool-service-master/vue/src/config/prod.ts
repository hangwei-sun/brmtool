import { proxy } from './proxy';

const publicOrigin = import.meta.env.VITE_PUBLIC_ORIGIN || location.origin;

export default {
	// 根地址
	host: publicOrigin || proxy['/prod/'].target,

	// 请求地址
	get baseUrl() {
		const mode = import.meta.env.MODE;

		if (mode == 'static') {
			return location.origin;
		} else {
			return '/api';
		}
	}
};
