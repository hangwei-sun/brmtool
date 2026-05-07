import { Column, Entity, Index } from 'typeorm';
import { BaseEntity, transformerJson } from '../../base/entity/base';

/**
 * AI-消息
 */
@Entity('ai_message')
export class AiMessageEntity extends BaseEntity {
  @Index()
  @Column({ comment: '会话ID' })
  conversationId: number;

  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '角色 system/user/assistant', length: 20 })
  role: string;

  @Column({ comment: '内容', nullable: true, type: 'text' })
  content: string;

  @Column({ comment: '推理内容', nullable: true, type: 'text' })
  reasoningContent: string;

  @Column({ comment: '模型ID', nullable: true, length: 80 })
  modelId: string;

  @Column({
    comment: 'token 用量',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  usage: Record<string, any>;

  @Column({ comment: '状态 1-成功 2-失败', default: 1 })
  status: number;

  @Column({ comment: '错误信息', nullable: true, type: 'text' })
  errorMessage: string;
}
