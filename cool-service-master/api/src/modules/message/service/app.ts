import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import * as moment from 'moment';
import { MessageInfoEntity } from '../entity/info';
import { MessageReadEntity } from '../entity/read';

interface MessageQuery {
  page?: number;
  size?: number;
}

/**
 * 桌面端消息服务
 */
@Provide()
export class MessageAppService {
  @InjectEntityModel(MessageInfoEntity)
  messageRepo: Repository<MessageInfoEntity>;

  @InjectEntityModel(MessageReadEntity)
  readRepo: Repository<MessageReadEntity>;

  async list(userId: number, query: MessageQuery) {
    const page = this.clampPositiveInteger(query.page, 1, 1, 10000);
    const size = this.clampPositiveInteger(query.size, 20, 1, 100);
    const visible = await this.visibleMessages(userId);
    const total = visible.length;
    const list = visible.slice((page - 1) * size, page * size);
    const readIds = await this.readIds(
      userId,
      list.map(e => e.id)
    );

    return {
      list: list.map(e => ({ ...e, isRead: readIds.has(e.id) })),
      total,
      page,
      size,
    };
  }

  async unreadCount(userId: number) {
    const visible = await this.visibleMessages(userId);
    const readIds = await this.readIds(
      userId,
      visible.map(e => e.id)
    );
    return { count: visible.filter(e => !readIds.has(e.id)).length };
  }

  async read(userId: number, messageId: number) {
    const visible = await this.visibleMessages(userId);
    const message = visible.find(e => e.id === messageId);
    if (!message) {
      return { read: false };
    }
    await this.saveRead(userId, message.id);
    return { read: true };
  }

  async readAll(userId: number) {
    const visible = await this.visibleMessages(userId);
    await Promise.all(visible.map(e => this.saveRead(userId, e.id)));
    return { read: true };
  }

  private async visibleMessages(userId: number) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const candidates = await this.messageRepo.find({
      where: [
        { status: 1, publishTime: LessThanOrEqual(now) },
        { status: 1, publishTime: IsNull() },
      ],
      order: { sort: 'ASC', createTime: 'DESC' },
      take: 500,
    });

    return candidates.filter(e => {
      if (e.targetType === 'all') {
        return true;
      }
      const ids = this.normalizeTargetUserIds(e.targetUserIds);
      return ids.includes(userId);
    });
  }

  private normalizeTargetUserIds(value: unknown) {
    if (Array.isArray(value)) {
      return value.map(Number).filter(e => Number.isInteger(e) && e > 0);
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map(Number).filter(e => Number.isInteger(e) && e > 0);
        }
      } catch {}
      return value
        .split(',')
        .map(e => Number(e.trim()))
        .filter(e => Number.isInteger(e) && e > 0);
    }

    return [];
  }

  private async readIds(userId: number, messageIds: number[]) {
    if (messageIds.length === 0) {
      return new Set<number>();
    }
    const reads = await this.readRepo.findBy({
      userId,
      messageId: In(messageIds),
    });
    return new Set(reads.map(e => e.messageId));
  }

  private async saveRead(userId: number, messageId: number) {
    const exists = await this.readRepo.findOneBy({ userId, messageId });
    if (!exists) {
      await this.readRepo.save({ userId, messageId });
    }
  }

  private clampPositiveInteger(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number
  ) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      return fallback;
    }
    return Math.min(Math.max(parsed, min), max);
  }
}
