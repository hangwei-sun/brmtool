import { CoolController, BaseController } from '@cool-midway/core';
import { ToolboxFeedbackEntity } from '../../entity/feedback';
import { ToolboxFeedbackService } from '../../service/feedback';

/**
 * 工具箱-使用建议
 */
@CoolController({
  api: ['delete', 'update', 'info', 'list', 'page'],
  entity: ToolboxFeedbackEntity,
  service: ToolboxFeedbackService,
  pageQueryOp: {
    keyWordLikeFields: ['a.title', 'a.content', 'a.userName', 'a.phone'],
    fieldEq: ['a.userId', 'a.status'],
    addOrderBy: {
      'a.createTime': 'DESC',
    },
  },
})
export class AdminToolboxFeedbackController extends BaseController {}
