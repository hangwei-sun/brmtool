import { ModuleConfig } from '@cool-midway/core';

/**
 * 工具箱模块配置
 */
export default () => {
  return {
    name: '数智工具箱',
    description: '桌面工具箱分类、工具、收藏与使用统计',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};
