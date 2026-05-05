import { CoolController, BaseController } from '@cool-midway/core';
import { MessageReadEntity } from '../../entity/read';

/**
 * 站内消息已读记录
 */
@CoolController({
  api: ['list', 'page', 'info'],
  entity: MessageReadEntity,
  pageQueryOp: {
    fieldEq: ['a.messageId', 'a.userId'],
    addOrderBy: {
      'a.createTime': 'DESC',
    },
  },
})
export class AdminMessageReadController extends BaseController {}
