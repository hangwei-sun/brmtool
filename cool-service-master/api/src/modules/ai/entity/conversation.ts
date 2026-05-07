import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

/**
 * AI-会话
 */
@Entity('ai_conversation')
export class AiConversationEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '会话标题', length: 120 })
  title: string;

  @Column({ comment: '模型ID', length: 80, default: 'deepseek-v4-pro' })
  modelId: string;

  @Column({ comment: '是否开启 thinking 0-否 1-是', default: 1 })
  thinking: number;

  @Column({ comment: '模式 agent/writing', length: 30, default: 'agent' })
  mode: string;

  @Column({ comment: '最后消息', nullable: true, type: 'text' })
  lastMessage: string;

  @Column({ comment: '最后消息时间', nullable: true })
  lastMessageTime: string;

  @Column({ comment: '状态 0-删除 1-正常', default: 1 })
  status: number;
}
