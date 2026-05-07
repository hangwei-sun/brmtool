import { Column, Entity, Index } from 'typeorm';
import { BaseEntity, transformerJson } from '../../base/entity/base';

/**
 * AI-模板
 */
@Entity('ai_template')
export class AiTemplateEntity extends BaseEntity {
  @Column({ comment: '模板标题', length: 120 })
  title: string;

  @Index()
  @Column({ comment: '分类', length: 40, default: 'discover' })
  category: string;

  @Column({ comment: '描述', nullable: true, type: 'text' })
  description: string;

  @Column({ comment: '封面图', nullable: true })
  cover: string;

  @Column({ comment: '提示词', type: 'text' })
  prompt: string;

  @Column({
    comment: '标签',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  tags: string[];

  @Column({ comment: '使用次数', default: 0 })
  useCount: number;

  @Column({ comment: '排序', default: 0 })
  sort: number;

  @Column({ comment: '状态 0-禁用 1-启用', default: 1 })
  status: number;
}
