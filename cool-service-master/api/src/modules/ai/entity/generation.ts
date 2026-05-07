import { Column, Entity, Index } from 'typeorm';
import { BaseEntity, transformerJson } from '../../base/entity/base';

/**
 * AI-多模态生成记录
 */
@Entity('ai_generation')
export class AiGenerationEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Index()
  @Column({
    comment: '生成类型 image/audio_music/audio_speech/video',
    length: 30,
  })
  type: string;

  @Column({ comment: '供应商', length: 30, default: 'volcengine' })
  provider: string;

  @Column({ comment: '模型ID', length: 80 })
  modelId: string;

  @Column({ comment: '提示词', type: 'text' })
  prompt: string;

  @Index()
  @Column({
    comment: '状态 processing/succeeded/failed',
    length: 20,
    default: 'processing',
  })
  status: string;

  @Column({ comment: '任务ID', nullable: true, length: 120 })
  taskId: string;

  @Column({
    comment: '输出地址',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  outputUrls: string[];

  @Column({
    comment: '原始响应',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  response: Record<string, any>;

  @Column({ comment: '错误信息', nullable: true, type: 'text' })
  errorMessage: string;
}
