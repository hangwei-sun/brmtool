import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 站内消息
 */
@Entity('message_info')
export class MessageInfoEntity extends BaseEntity {
  @Column({ comment: '标题', length: 120 })
  title: string;

  @Column({ comment: '内容', type: 'text' })
  content: string;

  @Index()
  @Column({
    comment: '等级 info/success/warning/error',
    length: 20,
    default: 'info',
  })
  level: string;

  @Index()
  @Column({
    comment: '目标范围 all/user',
    length: 20,
    default: 'all',
  })
  targetType: string;

  @Column({
    comment: '指定用户ID',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  targetUserIds: number[];

  @Column({ comment: '跳转类型 none/tool/link', length: 30, default: 'none' })
  actionType: string;

  @Column({ comment: '跳转值', nullable: true, type: 'text' })
  actionValue: string;

  @Index()
  @Column({ comment: '发布时间', nullable: true })
  publishTime: string;

  @Column({ comment: '排序', default: 0 })
  sort: number;

  @Index()
  @Column({ comment: '状态 0-草稿 1-发布 2-下线', default: 0 })
  status: number;

  @Column({ comment: '备注', nullable: true })
  remark: string;
}
