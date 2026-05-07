import { BaseController, CoolController } from '@cool-midway/core';
import { ToolboxStudyVideoEntity } from '../../entity/studyVideo';
import { ToolboxStudyVideoService } from '../../service/studyVideo';

/**
 * 工具箱-学习视频
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ToolboxStudyVideoEntity,
  service: ToolboxStudyVideoService,
  listQueryOp: {
    keyWordLikeFields: ['title', 'description', 'author'],
    fieldEq: ['category', 'status', 'isRecommend', 'isHot'],
    addOrderBy: {
      sort: 'DESC',
      createTime: 'DESC',
    },
  },
  pageQueryOp: {
    keyWordLikeFields: ['title', 'description', 'author'],
    fieldEq: ['category', 'status', 'isRecommend', 'isHot'],
    addOrderBy: {
      sort: 'DESC',
      createTime: 'DESC',
    },
  },
})
export class AdminToolboxStudyVideoController extends BaseController {}
