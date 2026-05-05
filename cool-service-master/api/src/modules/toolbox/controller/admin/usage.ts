import { Get, Inject, Query } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { ToolboxUsageEntity } from '../../entity/usage';
import { ToolboxUsageService } from '../../service/usage';
import { ToolboxAppService } from '../../service/app';

/**
 * 工具箱-使用统计
 */
@CoolController({
  api: ['list', 'page', 'info'],
  entity: ToolboxUsageEntity,
  service: ToolboxUsageService,
  pageQueryOp: {
    keyWordLikeFields: ['a.toolName'],
    fieldEq: ['a.userId', 'a.toolId', 'a.action', 'a.clientType'],
    addOrderBy: {
      'a.createTime': 'DESC',
    },
  },
})
export class AdminToolboxUsageController extends BaseController {
  @Inject()
  toolboxAppService: ToolboxAppService;

  @Get('/stats', { summary: '工具箱统计' })
  async stats() {
    return this.ok(await this.toolboxAppService.adminStats());
  }

  @Get('/userStats', { summary: '用户使用排行' })
  async userStats(@Query('limit') limit: number) {
    return this.ok(await this.toolboxAppService.adminUserStats(Number(limit)));
  }

  @Get('/userToolStats', { summary: '用户工具使用排行' })
  async userToolStats(
    @Query('userId') userId: number,
    @Query('limit') limit: number
  ) {
    return this.ok(
      await this.toolboxAppService.adminUserToolStats(
        Number(userId),
        Number(limit)
      )
    );
  }
}
