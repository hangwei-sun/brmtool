import { BaseController, CoolController } from '@cool-midway/core';
import { AiModelEntity } from '../../entity/model';
import { AiModelService } from '../../service/model';

/**
 * AI-模型管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: AiModelEntity,
  service: AiModelService,
  listQueryOp: {
    keyWordLikeFields: ['name', 'modelId', 'description'],
    fieldEq: ['provider', 'capability', 'status', 'isDefault'],
    addOrderBy: {
      sort: 'DESC',
      createTime: 'ASC',
    },
  },
  pageQueryOp: {
    keyWordLikeFields: ['a.name', 'a.modelId', 'a.description'],
    fieldEq: ['a.provider', 'a.capability', 'a.status', 'a.isDefault'],
    addOrderBy: {
      'a.sort': 'DESC',
      'a.createTime': 'ASC',
    },
  },
})
export class AdminAiModelController extends BaseController {}
