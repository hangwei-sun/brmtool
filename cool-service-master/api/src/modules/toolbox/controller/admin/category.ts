import { CoolController, BaseController } from '@cool-midway/core';
import { ToolboxCategoryEntity } from '../../entity/category';
import { ToolboxCategoryService } from '../../service/category';

/**
 * 工具箱-分类管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ToolboxCategoryEntity,
  service: ToolboxCategoryService,
  listQueryOp: {
    keyWordLikeFields: ['name', 'code'],
    fieldEq: ['status'],
    addOrderBy: {
      sort: 'ASC',
      createTime: 'ASC',
    },
  },
  pageQueryOp: {
    keyWordLikeFields: ['a.name', 'a.code'],
    fieldEq: ['a.status'],
    addOrderBy: {
      'a.sort': 'ASC',
      'a.createTime': 'ASC',
    },
  },
})
export class AdminToolboxCategoryController extends BaseController {}
