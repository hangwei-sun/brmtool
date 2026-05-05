import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';

/**
 * 工具箱-工具
 */
@Provide()
export class ToolboxToolService extends BaseService {
  async modifyBefore(data: any, type: 'delete' | 'update' | 'add') {
    if (type === 'delete') {
      return;
    }
    const list = Array.isArray(data) ? data : [data];
    for (const item of list) {
      if (item.type === 'external_link') {
        this.checkExternalLink(item.entry);
      }
    }
  }

  private checkExternalLink(entry: string) {
    try {
      const url = new URL(entry);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error();
      }
    } catch (error) {
      throw new CoolCommException('外部链接只允许 http 或 https 协议');
    }
  }
}
