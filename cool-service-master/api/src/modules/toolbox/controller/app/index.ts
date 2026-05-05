import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@midwayjs/core';
import {
  BaseController,
  CoolTag,
  CoolUrlTag,
  TagTypes,
} from '@cool-midway/core';
import { ToolboxAppService } from '../../service/app';
import { ToolboxFeedbackService } from '../../service/feedback';

/**
 * 工具箱-桌面端接口
 */
@Controller('/app/toolbox')
@CoolUrlTag()
export class AppToolboxController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  toolboxAppService: ToolboxAppService;

  @Inject()
  toolboxFeedbackService: ToolboxFeedbackService;

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/home', { summary: '工具箱首页数据' })
  async home() {
    return this.ok(await this.toolboxAppService.home(this.currentUserId()));
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/tools', { summary: '工具列表' })
  async tools(
    @Query('categoryId') categoryId: number,
    @Query('keyword') keyword: string,
    @Query('sort') sort: string,
    @Query('page') page: number,
    @Query('size') size: number
  ) {
    return this.ok(
      await this.toolboxAppService.findTools({
        categoryId,
        keyword,
        sort,
        page,
        size,
        userId: this.currentUserId(),
      })
    );
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/tools/:id', { summary: '工具详情' })
  async toolInfo(@Param('id') id: number) {
    return this.ok(
      await this.toolboxAppService.info(Number(id), this.currentUserId())
    );
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/favorite', { summary: '收藏或取消收藏工具' })
  async favorite(@Body('toolId') toolId: number) {
    return this.ok(
      await this.toolboxAppService.toggleFavorite(
        this.currentUserId(),
        Number(toolId)
      )
    );
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/usage', { summary: '记录工具使用行为' })
  async usage(
    @Body('toolId') toolId: number,
    @Body('clientType') clientType: string
  ) {
    return this.ok(
      await this.toolboxAppService.recordUsage(
        this.currentUserId(),
        Number(toolId),
        clientType || 'electron'
      )
    );
  }

  @Get('/feedback/mine', { summary: '我的使用建议' })
  async feedbackMine() {
    return this.ok(
      await this.toolboxFeedbackService.mine(this.currentUserId())
    );
  }

  @Post('/feedback/submit', { summary: '提交使用建议' })
  async feedbackSubmit(@Body() body) {
    return this.ok(
      await this.toolboxFeedbackService.submit(this.currentUserId(), body)
    );
  }

  private currentUserId() {
    return this.ctx.user?.id;
  }
}
