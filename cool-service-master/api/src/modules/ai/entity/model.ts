import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

/**
 * AI-模型配置
 */
@Entity('ai_model')
export class AiModelEntity extends BaseEntity {
  @Index()
  @Column({ comment: '供应商', length: 30, default: 'deepseek' })
  provider: string;

  @Index()
  @Column({
    comment: '能力 text/image/audio_music/audio_speech/video',
    length: 30,
    default: 'text',
  })
  capability: string;

  @Index({ unique: true })
  @Column({ comment: '模型ID', length: 80 })
  modelId: string;

  @Column({ comment: '展示名称', length: 80 })
  name: string;

  @Column({ comment: '描述', nullable: true, type: 'text' })
  description: string;

  @Column({
    comment: 'API Key',
    nullable: true,
    type: 'text',
    select: false,
  })
  apiKey: string;

  @Column({ comment: 'API Key 是否已配置 0-否 1-是', default: 0 })
  apiKeyConfigured: number;

  @Column({ comment: '接口 Base URL', nullable: true, length: 255 })
  apiBaseUrl: string;

  @Column({ comment: '生成接口路径', nullable: true, length: 255 })
  apiPath: string;

  @Column({
    comment: '任务查询接口路径，{taskId} 占位',
    nullable: true,
    length: 255,
  })
  apiTaskPath: string;

  @Column({ comment: '是否默认 0-否 1-是', default: 0 })
  isDefault: number;

  @Column({ comment: '默认开启 thinking 0-否 1-是', default: 1 })
  thinkingDefault: number;

  @Column({ comment: '排序', default: 0 })
  sort: number;

  @Column({ comment: '状态 0-禁用 1-启用', default: 1 })
  status: number;
}
