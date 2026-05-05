import { ModuleConfig } from '@cool-midway/core';

/**
 * 站内消息模块配置
 */
export default () => {
  return {
    name: '消息通知',
    description: '后台消息管理与桌面端站内信',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};
