import { BaseController, CoolController } from '@cool-midway/core';
import { ToolboxStudyCategoryEntity } from '../../entity/studyCategory';

/**
 * 工具箱-学习分类
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ToolboxStudyCategoryEntity,
  listQueryOp: {
    keyWordLikeFields: ['name', 'code'],
    fieldEq: ['status'],
    addOrderBy: {
      sort: 'DESC',
      createTime: 'DESC',
    },
  },
  pageQueryOp: {
    keyWordLikeFields: ['name', 'code'],
    fieldEq: ['status'],
    addOrderBy: {
      sort: 'DESC',
      createTime: 'DESC',
    },
  },
})
export class AdminToolboxStudyCategoryController extends BaseController {}
