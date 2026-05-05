import { CoolController, BaseController } from '@cool-midway/core';
import { MessageInfoEntity } from '../../entity/info';
import { MessageInfoService } from '../../service/info';

/**
 * 站内消息管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: MessageInfoEntity,
  service: MessageInfoService,
  listQueryOp: {
    keyWordLikeFields: ['title', 'content'],
    fieldEq: ['level', 'targetType', 'status'],
    addOrderBy: {
      sort: 'ASC',
      createTime: 'DESC',
    },
  },
  pageQueryOp: {
    keyWordLikeFields: ['a.title', 'a.content'],
    fieldEq: ['a.level', 'a.targetType', 'a.status'],
    addOrderBy: {
      'a.sort': 'ASC',
      'a.createTime': 'DESC',
    },
  },
})
export class AdminMessageInfoController extends BaseController {}
