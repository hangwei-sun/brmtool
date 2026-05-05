import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';

/**
 * 站内消息管理
 */
@Provide()
export class MessageInfoService extends BaseService {
  async modifyBefore(data: any, type: 'delete' | 'update' | 'add') {
    if (type === 'delete') {
      return;
    }

    const list = Array.isArray(data) ? data : [data];
    for (const item of list) {
      item.level = this.pick(
        item.level,
        ['info', 'success', 'warning', 'error'],
        'info'
      );
      item.targetType = this.pick(item.targetType, ['all', 'user'], 'all');
      item.actionType = this.pick(
        item.actionType,
        ['none', 'tool', 'link'],
        'none'
      );
      item.status = Number.isInteger(Number(item.status))
        ? Number(item.status)
        : 0;
      item.sort = Number.isInteger(Number(item.sort)) ? Number(item.sort) : 0;

      if (typeof item.targetUserIds === 'string') {
        item.targetUserIds = item.targetUserIds
          .split(',')
          .map(e => Number(e.trim()))
          .filter(e => Number.isInteger(e) && e > 0);
      }

      if (
        item.targetType === 'user' &&
        (!Array.isArray(item.targetUserIds) || item.targetUserIds.length === 0)
      ) {
        throw new CoolCommException('指定用户消息需要填写用户ID');
      }
    }
  }

  private pick(value: string, options: string[], fallback: string) {
    return options.includes(value) ? value : fallback;
  }
}
