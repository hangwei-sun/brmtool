import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Provide } from '@midwayjs/core';
import { Repository } from 'typeorm';
import { UserInfoEntity } from '../../user/entity/info';
import { ToolboxFeedbackEntity } from '../entity/feedback';

interface FeedbackSubmitDTO {
  title?: string;
  content?: string;
  contact?: string;
}

/**
 * 工具箱-使用建议
 */
@Provide()
export class ToolboxFeedbackService extends BaseService {
  @InjectEntityModel(ToolboxFeedbackEntity)
  feedbackRepo: Repository<ToolboxFeedbackEntity>;

  @InjectEntityModel(UserInfoEntity)
  userRepo: Repository<UserInfoEntity>;

  async submit(userId: number, data: FeedbackSubmitDTO) {
    const title = String(data.title || '').trim();
    const content = String(data.content || '').trim();
    const contact = String(data.contact || '').trim();

    if (!title) {
      throw new CoolCommException('请输入建议标题');
    }
    if (!content) {
      throw new CoolCommException('请输入建议内容');
    }
    if (title.length > 120) {
      throw new CoolCommException('标题不能超过 120 个字符');
    }
    if (content.length > 2000) {
      throw new CoolCommException('内容不能超过 2000 个字符');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new CoolCommException('用户不存在');
    }

    const record = await this.feedbackRepo.save({
      userId,
      userName: user.nickName,
      phone: user.phone,
      title,
      content,
      contact: contact.slice(0, 255),
      status: 0,
    });

    return { id: record.id };
  }

  async mine(userId: number) {
    return await this.feedbackRepo.find({
      where: { userId },
      order: { createTime: 'DESC' },
      take: 20,
    });
  }
}
