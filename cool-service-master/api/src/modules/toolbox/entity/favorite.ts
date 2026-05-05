import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 工具箱-用户收藏
 */
@Index(['userId', 'toolId'], { unique: true })
@Entity('toolbox_favorite')
export class ToolboxFavoriteEntity extends BaseEntity {
  @Index()
  @Column({ comment: '用户ID' })
  userId: number;

  @Index()
  @Column({ comment: '工具ID' })
  toolId: number;
}
