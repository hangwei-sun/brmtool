import { BaseService } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';

/**
 * AI-模板管理
 */
@Provide()
export class AiTemplateService extends BaseService {
  async modifyBefore(data: any, type: 'delete' | 'update' | 'add') {
    if (type === 'delete') {
      return;
    }

    const list = Array.isArray(data) ? data : [data];
    for (const item of list) {
      item.category = item.category || 'discover';
      item.status = Number(item.status ?? 1);
      item.sort = Number(item.sort || 0);
      item.useCount = Number(item.useCount || 0);

      if (typeof item.tags === 'string') {
        item.tags = item.tags
          .split(',')
          .map(e => e.trim())
          .filter(Boolean);
      }
    }
  }
}
