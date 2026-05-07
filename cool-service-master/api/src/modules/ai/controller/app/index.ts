import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@midwayjs/core';
import { BaseController } from '@cool-midway/core';
import { AiAppService } from '../../service/app';

/**
 * AI 工作台 APP 接口
 */
@Controller('/app/ai')
export class AppAiController extends BaseController {
  @Inject()
  ctx;

  @Inject()
  aiAppService: AiAppService;

  @Get('/models', { summary: 'AI 模型列表' })
  async models() {
    return this.ok(await this.aiAppService.models());
  }

  @Get('/templates', { summary: 'AI 模板列表' })
  async templates() {
    return this.ok(await this.aiAppService.templates());
  }

  @Get('/conversations', { summary: 'AI 会话列表' })
  async conversations(
    @Query('page') page: number,
    @Query('size') size: number
  ) {
    return this.ok(
      await this.aiAppService.conversations(this.ctx.user.id, { page, size })
    );
  }

  @Get('/conversations/:id', { summary: 'AI 会话详情' })
  async conversationInfo(@Param('id') id: number) {
    return this.ok(
      await this.aiAppService.conversationInfo(this.ctx.user.id, Number(id))
    );
  }

  @Post('/conversations', { summary: '创建 AI 会话' })
  async createConversation(@Body() body) {
    return this.ok(
      await this.aiAppService.createConversation(this.ctx.user.id, body)
    );
  }

  @Post('/conversations/delete', { summary: '删除 AI 会话' })
  async deleteConversation(@Body('id') id: number) {
    return this.ok(
      await this.aiAppService.deleteConversation(this.ctx.user.id, Number(id))
    );
  }

  @Post('/chat/send', { summary: '发送 AI 消息' })
  async send(@Body() body) {
    return this.ok(await this.aiAppService.send(this.ctx.user.id, body));
  }

  @Post('/chat/stream', { summary: '流式发送 AI 消息' })
  async stream(@Body() body) {
    await this.aiAppService.stream(this.ctx.user.id, body, this.ctx);
  }

  @Post('/generate', { summary: 'AI 多模态生成' })
  async generate(@Body() body) {
    return this.ok(await this.aiAppService.generate(this.ctx.user.id, body));
  }

  @Get('/generations', { summary: 'AI 多模态生成记录' })
  async generations(@Query('page') page: number, @Query('size') size: number) {
    return this.ok(
      await this.aiAppService.generations(this.ctx.user.id, { page, size })
    );
  }

  @Get('/generations/:id', { summary: 'AI 多模态生成详情' })
  async generationInfo(@Param('id') id: number) {
    return this.ok(
      await this.aiAppService.generationInfo(this.ctx.user.id, Number(id))
    );
  }

  @Post('/generations/sync', { summary: '同步 AI 多模态生成任务' })
  async syncGeneration(@Body('id') id: number) {
    return this.ok(
      await this.aiAppService.syncGeneration(this.ctx.user.id, Number(id))
    );
  }
}
