import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 工具箱-学习视频
 */
@Entity('toolbox_study_video')
export class ToolboxStudyVideoEntity extends BaseEntity {
  @Column({ comment: '视频标题', length: 160 })
  title: string;

  @Index()
  @Column({ comment: '分类', length: 50, default: 'frontend' })
  category: string;

  @Column({ comment: '简介', nullable: true, type: 'text' })
  description: string;

  @Column({ comment: '封面图', nullable: true, type: 'text' })
  coverUrl: string;

  @Column({ comment: '视频地址', nullable: true, type: 'text' })
  videoUrl: string;

  @Column({ comment: '视频时长', nullable: true, length: 20 })
  duration: string;

  @Column({ comment: '作者', nullable: true, length: 80 })
  author: string;

  @Column({ comment: '播放量', default: 0 })
  viewCount: number;

  @Index()
  @Column({ comment: '发布时间', nullable: true })
  publishTime: string;

  @Column({ comment: '是否推荐', default: 0 })
  isRecommend: number;

  @Column({ comment: '是否热门', default: 0 })
  isHot: number;

  @Column({ comment: '排序', default: 0 })
  sort: number;

  @Index()
  @Column({ comment: '状态 0-禁用 1-启用', default: 1 })
  status: number;

  @Column({ comment: '备注', nullable: true })
  remark: string;
}
