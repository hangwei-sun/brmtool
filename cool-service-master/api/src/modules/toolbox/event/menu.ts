import { CoolEvent, Event } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseSysMenuEntity } from '../../base/entity/sys/menu';

interface MenuSeed {
  name: string;
  router?: string | null;
  perms?: string | null;
  type: number;
  icon?: string | null;
  orderNum: number;
  viewPath?: string | null;
  keepAlive?: boolean;
  isShow?: boolean;
  childMenus?: MenuSeed[];
}

const learningMenus: MenuSeed[] = [
  {
    name: '学习分类',
    router: '/toolbox/study-category',
    perms: null,
    type: 1,
    icon: 'icon-menu',
    orderNum: 4,
    viewPath: 'modules/toolbox/views/study-category.vue',
    keepAlive: true,
    isShow: true,
    childMenus: [
      {
        name: '新增',
        perms: 'toolbox:studyCategory:add',
        type: 2,
        orderNum: 1,
      },
      {
        name: '删除',
        perms: 'toolbox:studyCategory:delete',
        type: 2,
        orderNum: 2,
      },
      {
        name: '修改',
        perms: 'toolbox:studyCategory:update',
        type: 2,
        orderNum: 3,
      },
      {
        name: '查询',
        perms:
          'toolbox:studyCategory:page,toolbox:studyCategory:list,toolbox:studyCategory:info',
        type: 2,
        orderNum: 4,
      },
    ],
  },
  {
    name: '学习入库',
    router: '/toolbox/study-video',
    perms: null,
    type: 1,
    icon: 'icon-log',
    orderNum: 5,
    viewPath: 'modules/toolbox/views/study-video.vue',
    keepAlive: true,
    isShow: true,
    childMenus: [
      { name: '新增', perms: 'toolbox:studyVideo:add', type: 2, orderNum: 1 },
      {
        name: '删除',
        perms: 'toolbox:studyVideo:delete',
        type: 2,
        orderNum: 2,
      },
      {
        name: '修改',
        perms: 'toolbox:studyVideo:update',
        type: 2,
        orderNum: 3,
      },
      {
        name: '查询',
        perms:
          'toolbox:studyVideo:page,toolbox:studyVideo:list,toolbox:studyVideo:info',
        type: 2,
        orderNum: 4,
      },
    ],
  },
];

/**
 * 工具箱菜单补丁
 *
 * COOL 的 menu.json 主要用于首次初始化；已有数据库不会自动合并新增菜单。
 * 这里幂等补齐学习中心相关菜单，避免升级后后台侧边栏看不到入口。
 */
@CoolEvent()
export class ToolboxMenuEvent {
  @InjectEntityModel(BaseSysMenuEntity)
  menuRepo: Repository<BaseSysMenuEntity>;

  @Event('onServerReady')
  async onServerReady() {
    await this.ensureLearningMenus();
  }

  private async ensureLearningMenus() {
    let root = await this.menuRepo.findOneBy({ router: '/toolbox' });

    if (!root) {
      root = await this.menuRepo.save({
        name: '数智工具箱',
        router: '/toolbox',
        perms: null,
        type: 0,
        icon: 'icon-app',
        orderNum: 1,
        viewPath: null,
        keepAlive: true,
        isShow: true,
      });
    }

    for (const menu of learningMenus) {
      const saved = await this.upsertChildMenu(root.id, menu);
      for (const child of menu.childMenus || []) {
        await this.upsertChildMenu(saved.id, child);
      }
    }
  }

  private async upsertChildMenu(parentId: number, seed: MenuSeed) {
    const existing = seed.router
      ? await this.menuRepo.findOneBy({ router: seed.router })
      : seed.perms
      ? await this.menuRepo.findOneBy({ parentId, perms: seed.perms })
      : await this.menuRepo.findOneBy({ parentId, name: seed.name });

    const payload = {
      parentId,
      name: seed.name,
      router: seed.router || null,
      perms: seed.perms || null,
      type: seed.type,
      icon: seed.icon || null,
      orderNum: seed.orderNum,
      viewPath: seed.viewPath || null,
      keepAlive: seed.keepAlive ?? false,
      isShow: seed.isShow ?? true,
    };

    return await this.menuRepo.save(
      existing ? { ...existing, ...payload } : payload
    );
  }
}
