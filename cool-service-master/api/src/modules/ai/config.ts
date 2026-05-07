import { ModuleConfig } from '@cool-midway/core';

/**
 * AI 工作台模块配置
 */
export default () => {
  return {
    name: 'AI 工作台',
    description: 'DeepSeek V4 对话、模板与模型配置',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};
