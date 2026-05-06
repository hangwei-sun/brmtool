import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 工具箱-插件市场
 */
@Entity('toolbox_plugin')
export class ToolboxPluginEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ comment: '插件编码', length: 80 })
  code: string;

  @Column({ comment: '插件名称', length: 80 })
  name: string;

  @Column({ comment: '插件描述', nullable: true, type: 'text' })
  description: string;

  @Column({ comment: '图标', nullable: true })
  icon: string;

  @Column({ comment: '版本号', length: 40 })
  version: string;

  @Column({ comment: '入口地址', type: 'text' })
  entry: string;

  @Column({ comment: '插件包地址', nullable: true, type: 'text' })
  packageUrl: string;

  @Column({ comment: '校验和', nullable: true, length: 128 })
  checksum: string;

  @Column({
    comment: '权限列表',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  permissions: string[];

  @Column({ comment: '最低客户端版本', nullable: true, length: 40 })
  minAppVersion: string;

  @Column({ comment: '更新说明', nullable: true, type: 'text' })
  changelog: string;

  @Column({
    comment: '插件清单',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  pluginJson: Record<string, any>;

  @Column({
    comment: '扩展配置',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  config: Record<string, any>;

  @Column({ comment: '审核状态 0-草稿 1-已通过 2-已拒绝', default: 0 })
  reviewStatus: number;

  @Column({ comment: '发布状态 0-下线 1-上线', default: 0 })
  publishStatus: number;

  @Column({ comment: '安装状态 0-未关联 1-已关联工具', default: 0 })
  installStatus: number;

  @Column({ comment: '排序', default: 0 })
  sort: number;

  @Column({ comment: '备注', nullable: true })
  remark: string;
}
