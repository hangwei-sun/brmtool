import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 工具箱-工具
 */
@Entity('toolbox_tool')
export class ToolboxToolEntity extends BaseEntity {
  @Index()
  @Column({ comment: '分类ID', nullable: true })
  categoryId: number;

  @Column({ comment: '工具名称', length: 80 })
  name: string;

  @Index({ unique: true })
  @Column({ comment: '工具编码', length: 80 })
  code: string;

  @Column({ comment: '工具描述', nullable: true, type: 'text' })
  description: string;

  @Column({ comment: '图标', nullable: true })
  icon: string;

  @Index()
  @Column({
    comment: '工具类型 external_link/internal_web/local_plugin',
    length: 30,
  })
  type: string;

  @Column({ comment: '入口地址或内部路由', type: 'text' })
  entry: string;

  @Column({ comment: '打开方式', length: 30, default: 'internal_route' })
  openMode: string;

  @Column({
    comment: '标签',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  tags: string[];

  @Column({ comment: '搜索关键词', nullable: true })
  keywords: string;

  @Column({ comment: '是否推荐', default: 0 })
  isRecommend: number;

  @Column({ comment: '是否热门', default: 0 })
  isHot: number;

  @Column({ comment: '是否最新', default: 0 })
  isNew: number;

  @Column({ comment: '访问权限 0-公开 1-登录后可用', default: 0 })
  authRequired: number;

  @Column({ comment: '排序', default: 0 })
  sort: number;

  @Column({ comment: '状态 0-禁用 1-启用', default: 1 })
  status: number;

  @Column({ comment: '版本', nullable: true })
  version: string;

  @Column({
    comment: '扩展配置',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  config: Record<string, any>;

  @Column({ comment: '备注', nullable: true })
  remark: string;
}
