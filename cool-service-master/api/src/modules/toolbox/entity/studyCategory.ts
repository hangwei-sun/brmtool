import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 工具箱-学习分类
 */
@Entity('toolbox_study_category')
export class ToolboxStudyCategoryEntity extends BaseEntity {
  @Column({ comment: '分类名称', length: 50 })
  name: string;

  @Index({ unique: true })
  @Column({ comment: '分类编码', length: 50 })
  code: string;

  @Column({ comment: '排序', default: 0 })
  sort: number;

  @Index()
  @Column({ comment: '状态 0-禁用 1-启用', default: 1 })
  status: number;

  @Column({ comment: '备注', nullable: true })
  remark: string;
}
