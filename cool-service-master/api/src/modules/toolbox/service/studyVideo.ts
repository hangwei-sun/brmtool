import { BaseService, CoolCommException } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Like, Not, Repository } from 'typeorm';
import { ToolboxStudyCategoryEntity } from '../entity/studyCategory';
import { ToolboxStudyVideoEntity } from '../entity/studyVideo';

interface StudyVideoQuery {
  category?: string;
  keyword?: string;
  sort?: string;
  page?: number;
  size?: number;
}

/**
 * 工具箱-学习视频
 */
@Provide()
export class ToolboxStudyVideoService extends BaseService {
  @InjectEntityModel(ToolboxStudyVideoEntity)
  studyVideoRepo: Repository<ToolboxStudyVideoEntity>;

  @InjectEntityModel(ToolboxStudyCategoryEntity)
  studyCategoryRepo: Repository<ToolboxStudyCategoryEntity>;

  async appCategories() {
    return await this.studyCategoryRepo.find({
      where: { status: 1 },
      order: { sort: 'DESC', createTime: 'DESC' },
    });
  }

  async appList(query: StudyVideoQuery) {
    const page = this.clampPositiveInteger(query.page, 1, 1, 10000);
    const size = this.clampPositiveInteger(query.size, 20, 1, 100);
    const qb = this.studyVideoRepo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 1 });

    if (query.category && query.category !== 'all') {
      qb.andWhere('a.category = :category', { category: query.category });
    }

    if (query.keyword) {
      qb.andWhere(
        '(a.title LIKE :keyword OR a.description LIKE :keyword OR a.author LIKE :keyword)',
        { keyword: `%${query.keyword}%` }
      );
    }

    if (query.sort === 'hot') {
      qb.addOrderBy('a.isHot', 'DESC').addOrderBy('a.viewCount', 'DESC');
    } else if (query.sort === 'recommend') {
      qb.addOrderBy('a.isRecommend', 'DESC');
    }

    qb.addOrderBy('a.sort', 'DESC').addOrderBy('a.createTime', 'DESC');

    const [list, total] = await qb
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return {
      list: list.map(item => this.normalizeMedia(item)),
      total,
      page,
      size,
    };
  }

  async appInfo(id: number) {
    const video = await this.studyVideoRepo.findOneBy({ id, status: 1 });
    if (!video) {
      throw new CoolCommException('学习视频不存在或已下线');
    }
    return this.normalizeMedia(video);
  }

  async appRecommend(id: number, limit = 6) {
    const video = await this.appInfo(id);
    const list = await this.studyVideoRepo.find({
      where: {
        status: 1,
        category: video.category,
        id: Not(video.id),
      },
      order: {
        isRecommend: 'DESC',
        isHot: 'DESC',
        sort: 'DESC',
        createTime: 'DESC',
      },
      take: this.clampPositiveInteger(limit, 6, 1, 20),
    });

    return list.map(item => this.normalizeMedia(item));
  }

  async adminPage(query: any = {}) {
    const page = this.clampPositiveInteger(query.page, 1, 1, 10000);
    const size = this.clampPositiveInteger(query.size, 20, 1, 100);
    const keyword = query.keyWord || query.keyword;
    const category = await this.validCategory(query.category);
    const where: any = {};

    if (category) where.category = category;
    if (query.status !== undefined && query.status !== '')
      where.status = Number(query.status);
    if (query.isRecommend !== undefined && query.isRecommend !== '')
      where.isRecommend = Number(query.isRecommend);
    if (query.isHot !== undefined && query.isHot !== '')
      where.isHot = Number(query.isHot);
    if (keyword) where.title = Like(`%${keyword}%`);

    const [list, total] = await this.studyVideoRepo.findAndCount({
      where,
      order: { sort: 'DESC', createTime: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return {
      list: list.map(item => this.normalizeMedia(item)),
      pagination: { page, size, total },
    };
  }

  async page(query: any = {}) {
    return this.adminPage(query);
  }

  async list(query: any = {}) {
    const keyword = query?.keyWord || query?.keyword;
    const category = await this.validCategory(query?.category);
    const where: any = {};

    if (category) where.category = category;
    if (query?.status !== undefined && query.status !== '')
      where.status = Number(query.status);
    if (query?.isRecommend !== undefined && query.isRecommend !== '')
      where.isRecommend = Number(query.isRecommend);
    if (query?.isHot !== undefined && query.isHot !== '')
      where.isHot = Number(query.isHot);
    if (keyword) where.title = Like(`%${keyword}%`);

    const list = await this.studyVideoRepo.find({
      where,
      order: { sort: 'DESC', createTime: 'DESC' },
      take: this.clampPositiveInteger(query?.size, 1000, 1, 1000),
    });

    return list.map(item => this.normalizeMedia(item));
  }

  private normalizeMedia(video: ToolboxStudyVideoEntity) {
    return {
      ...video,
      coverUrl: this.normalizeMediaUrl(video.coverUrl),
      videoUrl: this.normalizeMediaUrl(video.videoUrl),
    };
  }

  private async validCategory(category?: string) {
    if (!category) {
      return '';
    }

    const item = await this.studyCategoryRepo.findOneBy({ code: category });
    return item ? category : '';
  }

  private normalizeMediaUrl(value?: string) {
    if (!value) {
      return value;
    }

    const origin = this.publicOrigin();
    if (!origin) {
      return value;
    }

    if (value.startsWith('/upload/') || value.startsWith('/plugins/')) {
      return `${origin}${value}`;
    }

    try {
      const url = new URL(value);
      const isLocal =
        url.hostname === '127.0.0.1' || url.hostname === 'localhost';
      const isStaticFile =
        url.pathname.startsWith('/upload/') ||
        url.pathname.startsWith('/plugins/');

      return isLocal && isStaticFile
        ? `${origin}${url.pathname}${url.search}`
        : value;
    } catch {
      return value;
    }
  }

  private publicOrigin() {
    const deployDomain = process.env.DEPLOY_DOMAIN
      ? `https://${process.env.DEPLOY_DOMAIN}`
      : '';
    const value = process.env.BRMTOOL_PUBLIC_ORIGIN || deployDomain;

    return value.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  private clampPositiveInteger(
    value: unknown,
    defaultValue: number,
    min: number,
    max: number
  ) {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue)) {
      return defaultValue;
    }
    return Math.min(max, Math.max(min, numberValue));
  }
}
