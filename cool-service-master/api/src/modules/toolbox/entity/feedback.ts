import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 工具箱-使用建议
 */
@Entity('toolbox_feedback')
export class ToolboxFeedbackEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '用户昵称', nullable: true })
  userName: string;

  @Column({ comment: '手机号', nullable: true })
  phone: string;

  @Column({ comment: '标题', length: 120 })
  title: string;

  @Column({ comment: '内容', type: 'text' })
  content: string;

  @Column({ comment: '联系方式', nullable: true })
  contact: string;

  @Column({ comment: '状态 0-待处理 1-已处理', default: 0 })
  status: number;

  @Column({ comment: '处理备注', nullable: true, type: 'text' })
  reply: string;
}
