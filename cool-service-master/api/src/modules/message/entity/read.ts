import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 站内消息已读记录
 */
@Index(['messageId', 'userId'], { unique: true })
@Entity('message_read')
export class MessageReadEntity extends BaseEntity {
  @Index()
  @Column({ comment: '消息ID' })
  messageId: number;

  @Index()
  @Column({ comment: '用户ID' })
  userId: number;
}
