import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 工具箱-使用记录
 */
@Entity('toolbox_usage')
export class ToolboxUsageEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Index()
  @Column({ comment: '工具ID' })
  toolId: number;

  @Column({ comment: '工具名称快照', length: 80 })
  toolName: string;

  @Column({ comment: '行为', length: 30, default: 'open' })
  action: string;

  @Column({ comment: '客户端类型', length: 30, default: 'electron' })
  clientType: string;
}
