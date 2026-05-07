import { BaseController, CoolController } from '@cool-midway/core';
import { AiTemplateEntity } from '../../entity/template';
import { AiTemplateService } from '../../service/template';

/**
 * AI-模板管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: AiTemplateEntity,
  service: AiTemplateService,
  listQueryOp: {
    keyWordLikeFields: ['title', 'description', 'prompt'],
    fieldEq: ['category', 'status'],
    addOrderBy: {
      sort: 'DESC',
      createTime: 'DESC',
    },
  },
  pageQueryOp: {
    keyWordLikeFields: ['a.title', 'a.description', 'a.prompt'],
    fieldEq: ['a.category', 'a.status'],
    addOrderBy: {
      'a.sort': 'DESC',
      'a.createTime': 'DESC',
    },
  },
})
export class AdminAiTemplateController extends BaseController {}
