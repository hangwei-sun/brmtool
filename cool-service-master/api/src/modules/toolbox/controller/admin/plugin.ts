import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Fields, Files, Inject, Post } from '@midwayjs/core';
import { ToolboxPluginEntity } from '../../entity/plugin';
import { ToolboxPluginService } from '../../service/plugin';

/**
 * 工具箱-插件市场
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ToolboxPluginEntity,
  service: ToolboxPluginService,
  listQueryOp: {
    keyWordLikeFields: ['name', 'code', 'description', 'changelog'],
    fieldEq: ['reviewStatus', 'publishStatus', 'installStatus'],
    addOrderBy: {
      sort: 'DESC',
      createTime: 'DESC',
    },
  },
  pageQueryOp: {
    keyWordLikeFields: ['a.name', 'a.code', 'a.description', 'a.changelog'],
    fieldEq: ['a.reviewStatus', 'a.publishStatus', 'a.installStatus'],
    addOrderBy: {
      'a.sort': 'DESC',
      'a.createTime': 'DESC',
    },
  },
})
export class AdminToolboxPluginController extends BaseController {
  @Inject()
  toolboxPluginService: ToolboxPluginService;

  @Post('/publish', { summary: '发布插件并关联工具' })
  async publish(@Body('id') id: number) {
    return this.ok(await this.toolboxPluginService.publish(Number(id)));
  }

  @Post('/offline', { summary: '下线插件' })
  async offline(@Body('id') id: number) {
    return this.ok(await this.toolboxPluginService.offline(Number(id)));
  }

  @Post('/linkTool', { summary: '关联为工具' })
  async linkTool(@Body('id') id: number) {
    return this.ok(await this.toolboxPluginService.linkTool(Number(id)));
  }

  @Post('/uploadPackage', { summary: '上传插件包' })
  async uploadPackage(@Files() files: any[], @Fields() fields: any) {
    return this.ok(
      await this.toolboxPluginService.uploadPackage(
        files?.[0]?.data,
        fields?.code
      )
    );
  }
}
