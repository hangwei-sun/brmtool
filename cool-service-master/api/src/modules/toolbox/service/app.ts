import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { CoolCommException } from '@cool-midway/core';
import { In, Like, Repository } from 'typeorm';
import * as moment from 'moment';
import { ToolboxCategoryEntity } from '../entity/category';
import { ToolboxFavoriteEntity } from '../entity/favorite';
import { ToolboxToolEntity } from '../entity/tool';
import { ToolboxUsageEntity } from '../entity/usage';

interface ToolQuery {
  categoryId?: number;
  keyword?: string;
  sort?: string;
  page?: number;
  size?: number;
  userId?: number;
}

/**
 * 工具箱-桌面端聚合服务
 */
@Provide()
export class ToolboxAppService {
  @InjectEntityModel(ToolboxCategoryEntity)
  categoryRepo: Repository<ToolboxCategoryEntity>;

  @InjectEntityModel(ToolboxToolEntity)
  toolRepo: Repository<ToolboxToolEntity>;

  @InjectEntityModel(ToolboxFavoriteEntity)
  favoriteRepo: Repository<ToolboxFavoriteEntity>;

  @InjectEntityModel(ToolboxUsageEntity)
  usageRepo: Repository<ToolboxUsageEntity>;

  async home(userId?: number) {
    const categories = await this.categoryRepo.find({
      where: { status: 1 },
      order: { sort: 'ASC', createTime: 'ASC' },
    });
    const recommendTools = await this.findTools({ sort: 'recommend', size: 8 });
    const newTools = await this.findTools({ sort: 'new', size: 8 });
    const hotTools = await this.findTools({ sort: 'hot', size: 8 });
    const hasUser = this.hasUser(userId);
    const favoriteTools = hasUser ? await this.favoriteTools(userId) : [];
    const recentTools = hasUser ? await this.recentTools(userId) : [];
    const usageStats = hasUser
      ? await this.usageStats(userId)
      : { todayCount: 0, totalCount: 0 };

    return {
      categories,
      recommendTools: recommendTools.list,
      newTools: newTools.list,
      hotTools: hotTools.list,
      favoriteTools,
      recentTools,
      usageStats,
    };
  }

  async findTools(query: ToolQuery) {
    const page = this.clampPositiveInteger(query.page, 1, 1, 10000);
    const size = this.clampPositiveInteger(query.size, 20, 1, 100);
    const qb = this.toolRepo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 1 });

    if (query.categoryId) {
      qb.andWhere('a.categoryId = :categoryId', {
        categoryId: Number(query.categoryId),
      });
    }

    if (query.keyword) {
      qb.andWhere(
        '(a.name LIKE :keyword OR a.description LIKE :keyword OR a.keywords LIKE :keyword)',
        { keyword: `%${query.keyword}%` }
      );
    }

    if (query.sort === 'hot') {
      qb.addOrderBy('a.isHot', 'DESC');
    } else if (query.sort === 'new') {
      qb.addOrderBy('a.isNew', 'DESC');
    } else if (query.sort === 'recommend') {
      qb.addOrderBy('a.isRecommend', 'DESC');
    }

    qb.addOrderBy('a.sort', 'DESC').addOrderBy('a.createTime', 'DESC');

    const [list, total] = await qb
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    if (!this.hasUser(query.userId) || list.length === 0) {
      return { list, total, page, size };
    }

    const favorites = await this.favoriteRepo.findBy({
      userId: query.userId,
      toolId: In(list.map(e => e.id)),
    });
    const favoriteIds = favorites.map(e => e.toolId);
    return {
      list: list.map(e => ({ ...e, isFavorite: favoriteIds.includes(e.id) })),
      total,
      page,
      size,
    };
  }

  async info(id: number, userId?: number) {
    const tool = await this.toolRepo.findOneBy({ id, status: 1 });
    this.checkToolAccess(tool, userId);
    if (!tool || !this.hasUser(userId)) {
      return tool;
    }
    const favorite = await this.favoriteRepo.findOneBy({
      userId,
      toolId: tool.id,
    });
    return { ...tool, isFavorite: !!favorite };
  }

  async toggleFavorite(userId: number, toolId: number, favorited?: boolean) {
    if (!this.hasUser(userId)) {
      throw new CoolCommException('请先登录');
    }
    await this.checkEnabledTool(toolId, userId);

    const exists = await this.favoriteRepo.findOneBy({ userId, toolId });
    if (favorited !== undefined && favorited !== null) {
      const target = this.normalizeBoolean(favorited);
      if (target && !exists) {
        await this.favoriteRepo.save({ userId, toolId });
      }
      if (!target && exists) {
        await this.favoriteRepo.delete({ userId, toolId });
      }
      return { favorited: target };
    }

    if (exists) {
      await this.favoriteRepo.delete({ userId, toolId });
      return { favorited: false };
    }
    await this.favoriteRepo.save({ userId, toolId });
    return { favorited: true };
  }

  async recordUsage(
    userId: number | undefined,
    toolId: number,
    clientType = 'electron'
  ) {
    const tool = await this.toolRepo.findOneBy({ id: toolId, status: 1 });
    if (!tool) {
      return null;
    }
    this.checkToolAccess(tool, userId);
    await this.usageRepo.save({
      userId: this.hasUser(userId) ? Number(userId) : 0,
      toolId,
      toolName: tool.name,
      action: 'open',
      clientType: this.normalizeClientType(clientType),
    });
    return { recorded: true };
  }

  async adminStats() {
    const today = moment().format('YYYY-MM-DD');
    const [todayCount, totalCount, popularTools, userStats] = await Promise.all(
      [
        this.usageRepo.countBy({ createTime: Like(`${today}%`) as any }),
        this.usageRepo.count(),
        this.popularTools(),
        this.userStats(20),
      ]
    );

    return { todayCount, totalCount, popularTools, userStats };
  }

  async adminUserStats(limit = 500) {
    return await this.userStats(this.clampPositiveInteger(limit, 500, 1, 1000));
  }

  async adminUserToolStats(userId: number, limit = 500) {
    return await this.userToolStats(
      Number.isInteger(userId) && userId >= 0 ? userId : 0,
      this.clampPositiveInteger(limit, 500, 1, 1000)
    );
  }

  private async favoriteTools(userId: number) {
    const favorites = await this.favoriteRepo.find({
      where: { userId },
    });
    if (favorites.length === 0) {
      return [];
    }
    const tools = await this.toolRepo.findBy({
      id: In(favorites.map(e => e.toolId)),
      status: 1,
    });
    const toolMap = new Map(tools.map(e => [e.id, e]));
    const favoriteTools = favorites
      .map(e => toolMap.get(e.toolId))
      .filter(Boolean) as ToolboxToolEntity[];
    return this.sortToolsByBackendOrder(favoriteTools)
      .map(e => ({
        ...e,
        isFavorite: true,
      }));
  }

  private async recentTools(userId: number) {
    const usages = await this.usageRepo.find({
      where: { userId, action: 'open' },
      order: { createTime: 'DESC' },
      take: 30,
    });
    const toolIds = Array.from(new Set(usages.map(e => e.toolId))).slice(0, 8);
    if (toolIds.length === 0) {
      return [];
    }
    const tools = await this.toolRepo.findBy({ id: In(toolIds), status: 1 });
    const toolMap = new Map(tools.map(e => [e.id, e]));
    return toolIds.map(id => toolMap.get(id)).filter(Boolean);
  }

  private async usageStats(userId: number) {
    const today = moment().format('YYYY-MM-DD');
    const [todayCount, totalCount] = await Promise.all([
      this.usageRepo.countBy({
        userId,
        action: 'open',
        createTime: Like(`${today}%`) as any,
      }),
      this.usageRepo.countBy({ userId, action: 'open' }),
    ]);
    return { todayCount, totalCount };
  }

  private async popularTools() {
    return await this.usageRepo
      .createQueryBuilder('a')
      .select('a.toolId', 'toolId')
      .addSelect('a.toolName', 'toolName')
      .addSelect('COUNT(1)', 'count')
      .where('a.action = :action', { action: 'open' })
      .groupBy('a.toolId')
      .addGroupBy('a.toolName')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
  }

  private async userStats(limit: number) {
    return await this.usageRepo
      .createQueryBuilder('a')
      .leftJoin('user_info', 'b', 'a.userId = b.id')
      .select('a.userId', 'userId')
      .addSelect(
        'COALESCE(b.nickName, IF(a.userId = 0, "匿名用户", "未命名用户"))',
        'nickName'
      )
      .addSelect('b.phone', 'phone')
      .addSelect('COUNT(1)', 'count')
      .addSelect(
        'SUM(CASE WHEN a.createTime LIKE :today THEN 1 ELSE 0 END)',
        'todayCount'
      )
      .addSelect('MAX(a.createTime)', 'lastUseTime')
      .where('a.action = :action', {
        action: 'open',
        today: `${moment().format('YYYY-MM-DD')}%`,
      })
      .groupBy('a.userId')
      .addGroupBy('b.nickName')
      .addGroupBy('b.phone')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  private async userToolStats(userId: number, limit: number) {
    return await this.usageRepo
      .createQueryBuilder('a')
      .select('a.toolId', 'toolId')
      .addSelect('a.toolName', 'toolName')
      .addSelect('COUNT(1)', 'count')
      .addSelect(
        'SUM(CASE WHEN a.createTime LIKE :today THEN 1 ELSE 0 END)',
        'todayCount'
      )
      .addSelect('MAX(a.createTime)', 'lastUseTime')
      .where('a.action = :action', {
        action: 'open',
        today: `${moment().format('YYYY-MM-DD')}%`,
      })
      .andWhere('a.userId = :userId', { userId })
      .groupBy('a.toolId')
      .addGroupBy('a.toolName')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  private hasUser(userId?: number) {
    return typeof userId === 'number' && Number.isInteger(userId) && userId > 0;
  }

  private normalizeBoolean(value: unknown) {
    return value === true || value === 'true' || value === 1 || value === '1';
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

  private async checkEnabledTool(toolId: number, userId?: number) {
    if (!Number.isInteger(toolId) || toolId <= 0) {
      throw new CoolCommException('工具不存在或已禁用');
    }

    const tool = await this.toolRepo.findOneBy({ id: toolId, status: 1 });
    if (!tool) {
      throw new CoolCommException('工具不存在或已禁用');
    }
    this.checkToolAccess(tool, userId);
    return tool;
  }

  private checkToolAccess(tool?: ToolboxToolEntity | null, userId?: number) {
    if (tool?.authRequired === 1 && !this.hasUser(userId)) {
      throw new CoolCommException('该工具需要登录后使用');
    }
  }

  private normalizeClientType(clientType: string) {
    const value = String(clientType || 'electron').trim();
    return value.slice(0, 30) || 'electron';
  }

  private sortToolsByBackendOrder(tools: ToolboxToolEntity[]) {
    return tools.sort(
      (a, b) =>
        Number(b.sort || 0) - Number(a.sort || 0) ||
        Number(b.id || 0) - Number(a.id || 0)
    );
  }
}
