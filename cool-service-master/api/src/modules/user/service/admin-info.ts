import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import * as md5 from 'md5';

/**
 * APP用户后台管理
 */
@Provide()
export class UserAdminInfoService extends BaseService {
  async modifyBefore(data: any, type: 'delete' | 'update' | 'add') {
    if (type === 'delete') {
      return;
    }

    const list = Array.isArray(data) ? data : [data];
    for (const item of list) {
      if (typeof item.password === 'string' && item.password.trim()) {
        item.password = this.normalizePassword(item.password);
      } else if (type === 'update') {
        delete item.password;
      }
    }
  }

  private normalizePassword(password: string) {
    const value = password.trim();
    return /^[a-f0-9]{32}$/i.test(value) ? value : md5(value);
  }
}
