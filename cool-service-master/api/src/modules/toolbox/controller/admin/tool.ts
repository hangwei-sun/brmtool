import { CoolController, BaseController } from '@cool-midway/core';
import { ToolboxCategoryEntity } from '../../entity/category';
import { ToolboxToolEntity } from '../../entity/tool';
import { ToolboxToolService } from '../../service/tool';

/**
 * 工具箱-工具管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ToolboxToolEntity,
  service: ToolboxToolService,
  listQueryOp: {
    keyWordLikeFields: ['name', 'code', 'description', 'keywords'],
    fieldEq: ['categoryId', 'type', 'status', 'isRecommend', 'isHot', 'isNew'],
    addOrderBy: {
      sort: 'ASC',
      createTime: 'ASC',
    },
  },
  pageQueryOp: {
    keyWordLikeFields: ['a.name', 'a.code', 'a.description', 'a.keywords'],
    fieldEq: [
      'a.categoryId',
      'a.type',
      'a.status',
      'a.isRecommend',
      'a.isHot',
      'a.isNew',
    ],
    select: ['a.*', 'b.name as categoryName'],
    join: [
      {
        entity: ToolboxCategoryEntity,
        alias: 'b',
        condition: 'a.categoryId = b.id',
      },
    ],
    addOrderBy: {
      'a.sort': 'ASC',
      'a.createTime': 'ASC',
    },
  },
})
export class AdminToolboxToolController extends BaseController {}
