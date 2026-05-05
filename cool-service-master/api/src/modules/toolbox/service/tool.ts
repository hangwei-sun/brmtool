import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { Repository } from 'typeorm';
import { ToolboxCategoryEntity } from '../entity/category';
import { ToolboxToolEntity } from '../entity/tool';

/**
 * 工具箱-工具
 */
@Provide()
export class ToolboxToolService extends BaseService {
  @InjectEntityModel(ToolboxCategoryEntity)
  categoryRepo: Repository<ToolboxCategoryEntity>;

  @InjectEntityModel(ToolboxToolEntity)
  toolRepo: Repository<ToolboxToolEntity>;

  async modifyBefore(data: any, type: 'delete' | 'update' | 'add') {
    if (type === 'delete') {
      return;
    }
    const list = Array.isArray(data) ? data : [data];
    for (const item of list) {
      if (item.type === 'external_link') {
        this.checkExternalLink(item.entry);
      }
    }
  }

  private checkExternalLink(entry: string) {
    try {
      const url = new URL(entry);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error();
      }
    } catch (error) {
      throw new CoolCommException('外部链接只允许 http 或 https 协议');
    }
  }

  async ensureFeedbackTool() {
    let category = await this.categoryRepo.findOne({
      where: { code: 'tool' },
    });

    if (!category) {
      category = await this.categoryRepo.findOne({
        where: { code: 'tools' },
      });
    }

    if (!category) {
      category = await this.categoryRepo.save({
        name: '工具',
        code: 'tool',
        icon: '工',
        sort: 20,
        status: 1,
        remark: '系统自动创建，用于归类本地插件',
      });
    }

    const payload: Partial<ToolboxToolEntity> = {
      categoryId: category.id,
      name: '留言板',
      code: 'feedback-board',
      description: '登录用户提交工具箱使用建议，管理员后台可查看处理。',
      icon: 'MSG',
      type: 'local_plugin',
      entry: 'feedback-board',
      openMode: 'internal_route',
      tags: ['建议', '反馈'],
      keywords: 'feedback liuyan jianyi 留言 建议 反馈',
      isRecommend: 1,
      isHot: 0,
      isNew: 1,
      authRequired: 1,
      sort: 90,
      status: 1,
      version: '1.0.0',
      config: {},
      remark: '系统内置本地插件：使用建议留言板',
    };

    const current = await this.toolRepo.findOne({
      where: { code: 'feedback-board' },
    });

    if (current) {
      return { created: false, id: current.id };
    }

    const record = await this.toolRepo.save(payload);
    return { created: true, id: record.id };
  }
}
