import { BaseService } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { AiModelEntity } from '../entity/model';

/**
 * AI-模型管理
 */
@Provide()
export class AiModelService extends BaseService {
  @InjectEntityModel(AiModelEntity)
  modelRepo: Repository<AiModelEntity>;

  async modifyBefore(data: any, type: 'delete' | 'update' | 'add') {
    if (type === 'delete') {
      return;
    }

    const list = Array.isArray(data) ? data : [data];
    for (const item of list) {
      item.provider = item.provider || 'deepseek';
      item.capability = item.capability || 'text';
      item.isDefault = Number(item.isDefault || 0);
      item.thinkingDefault = Number(item.thinkingDefault || 0);
      item.status = Number(item.status ?? 1);
      item.sort = Number(item.sort || 0);
      const apiKey = String(item.apiKey || '').trim();
      if (apiKey) {
        item.apiKey = apiKey;
        item.apiKeyConfigured = 1;
      } else if (type === 'update') {
        delete item.apiKey;
      } else {
        item.apiKeyConfigured = 0;
      }
      if (item.isDefault === 1) {
        const qb = this.modelRepo
          .createQueryBuilder()
          .update(AiModelEntity)
          .set({ isDefault: 0 })
          .where('provider = :provider', { provider: item.provider })
          .andWhere('capability = :capability', {
            capability: item.capability,
          });
        if (item.id) {
          qb.andWhere('id != :id', { id: Number(item.id) });
        }
        await qb.execute();
      }
    }
  }
}
