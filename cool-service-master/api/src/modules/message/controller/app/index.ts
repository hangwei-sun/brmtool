import { Body, Controller, Get, Inject, Post, Query } from '@midwayjs/core';
import { BaseController } from '@cool-midway/core';
import { MessageAppService } from '../../service/app';

/**
 * 桌面端站内消息
 */
@Controller('/app/message')
export class AppMessageController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  messageAppService: MessageAppService;

  @Get('/list', { summary: '消息列表' })
  async messageList(@Query('page') page: number, @Query('size') size: number) {
    return this.ok(
      await this.messageAppService.list(this.ctx.user.id, { page, size })
    );
  }

  @Get('/unreadCount', { summary: '未读数' })
  async unreadCount() {
    return this.ok(await this.messageAppService.unreadCount(this.ctx.user.id));
  }

  @Post('/read', { summary: '标记已读' })
  async read(@Body('messageId') messageId: number) {
    return this.ok(
      await this.messageAppService.read(this.ctx.user.id, Number(messageId))
    );
  }

  @Post('/readAll', { summary: '全部已读' })
  async readAll() {
    return this.ok(await this.messageAppService.readAll(this.ctx.user.id));
  }
}
