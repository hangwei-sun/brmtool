import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { pToolboxPluginPath } from '../../../comm/path';
import { ToolboxCategoryEntity } from '../entity/category';
import { ToolboxPluginEntity } from '../entity/plugin';
import { ToolboxToolEntity } from '../entity/tool';

const AdmZip = require('adm-zip');

const ALLOWED_PLUGIN_PERMISSIONS = new Set([
  'network:app-api',
  'storage:plugin',
  'notification:readonly',
]);

interface InstalledPlugin {
  code: string;
  version?: string;
}

interface UploadedManifest {
  code: string;
  name: string;
  version: string;
  entry?: string;
  icon?: string;
  description?: string;
  permissions?: string[];
  minAppVersion?: string;
  changelog?: string;
  sort?: number;
}

/**
 * 工具箱-插件市场
 */
@Provide()
export class ToolboxPluginService extends BaseService {
  @InjectEntityModel(ToolboxPluginEntity)
  pluginRepo: Repository<ToolboxPluginEntity>;

  @InjectEntityModel(ToolboxToolEntity)
  toolRepo: Repository<ToolboxToolEntity>;

  @InjectEntityModel(ToolboxCategoryEntity)
  categoryRepo: Repository<ToolboxCategoryEntity>;

  async modifyBefore(data: any, type: 'delete' | 'update' | 'add') {
    if (type === 'delete') {
      return;
    }

    const list = Array.isArray(data) ? data : [data];
    for (const item of list) {
      this.normalizePluginPayload(item);
      this.checkPluginPayload(item);
    }
  }

  async uploadPackage(filePath: string, forceCode?: string) {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new CoolCommException('请上传插件 zip 包');
    }

    const buffer = fs.readFileSync(filePath);
    const checksum = `sha256:${crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex')}`;
    const zip = new AdmZip(filePath);
    const manifestEntry = zip.getEntry('plugin.json');
    if (!manifestEntry) {
      throw new CoolCommException('插件包根目录必须包含 plugin.json');
    }

    const manifest = this.parseManifest(manifestEntry.getData().toString());
    if (forceCode && forceCode !== manifest.code) {
      throw new CoolCommException('上传包插件编码与当前记录不一致');
    }

    const code = manifest.code;
    const version = manifest.version;
    const entryFile = this.normalizeZipEntry(manifest.entry || 'index.html');
    if (!zip.getEntry(entryFile)) {
      throw new CoolCommException(`插件入口文件不存在：${entryFile}`);
    }

    const finalEntry = `/plugins/${code}/${version}/${entryFile}`;
    const payload: Partial<ToolboxPluginEntity> = {
      code,
      name: manifest.name,
      version,
      description: manifest.description,
      icon: manifest.icon || 'PLG',
      entry: finalEntry,
      packageUrl: `/plugins/${code}/${version}.zip`,
      checksum,
      permissions: this.normalizePermissions(manifest.permissions),
      minAppVersion: manifest.minAppVersion,
      changelog: manifest.changelog,
      sort: Number(manifest.sort || 0),
      pluginJson: {
        ...manifest,
        entry: finalEntry,
        packageUrl: `/plugins/${code}/${version}.zip`,
        checksum,
      },
      config: {
        package: {
          entryFile,
          uploadedAt: new Date().toISOString(),
        },
      },
      reviewStatus: 0,
      publishStatus: 0,
    };

    this.normalizePluginPayload(payload);
    this.checkPluginPayload(payload);
    this.extractPackage(zip, code, version);
    this.writePackage(buffer, code, version);

    let plugin = await this.pluginRepo.findOne({ where: { code } });
    if (plugin) {
      const config = {
        ...(plugin.config || {}),
        ...(payload.config || {}),
      };
      await this.pluginRepo.update(
        { id: plugin.id },
        {
          ...payload,
          config,
        }
      );
      plugin = await this.pluginRepo.findOneBy({ id: plugin.id });
    } else {
      plugin = await this.pluginRepo.save(payload);
    }

    return {
      id: plugin.id,
      plugin: this.publicPluginPayload(plugin),
    };
  }

  async publish(id: number) {
    const plugin = await this.getPlugin(id);
    this.checkPluginPayload(plugin);

    plugin.reviewStatus = 1;
    plugin.publishStatus = 1;
    await this.pluginRepo.save(plugin);
    const tool = await this.linkTool(plugin.id);
    return { published: true, toolId: tool.id };
  }

  async offline(id: number) {
    const plugin = await this.getPlugin(id);
    plugin.publishStatus = 0;
    await this.pluginRepo.save(plugin);
    await this.toolRepo.update(
      { code: this.toolCode(plugin.code) },
      { status: 0 }
    );
    return { offline: true };
  }

  async linkTool(id: number) {
    const plugin = await this.getPlugin(id);
    this.checkPluginPayload(plugin);

    const category = await this.ensurePluginCategory();
    const payload: Partial<ToolboxToolEntity> = {
      categoryId: category.id,
      name: plugin.name,
      code: this.toolCode(plugin.code),
      description:
        plugin.description || plugin.changelog || '第三方 Web 沙箱插件',
      icon: plugin.icon || 'PLG',
      type: 'local_plugin',
      entry: `plugin:${plugin.code}`,
      openMode: 'internal_route',
      tags: ['插件'],
      keywords: `${plugin.code} ${plugin.name} plugin 插件`,
      isRecommend: 0,
      isHot: 0,
      isNew: 1,
      authRequired: 1,
      sort: Number(plugin.sort || 0),
      status: plugin.publishStatus === 1 ? 1 : 0,
      version: plugin.version,
      config: {
        plugin: this.publicPluginPayload(plugin),
      },
      remark: '工具箱插件市场自动关联工具',
    };

    let tool = await this.toolRepo.findOne({
      where: { code: this.toolCode(plugin.code) },
    });

    if (tool) {
      await this.toolRepo.update({ id: tool.id }, payload);
      tool = await this.toolRepo.findOneBy({ id: tool.id });
    } else {
      tool = await this.toolRepo.save(payload);
    }

    plugin.installStatus = 1;
    await this.pluginRepo.save(plugin);
    return tool;
  }

  async market() {
    const list = await this.pluginRepo.find({
      where: { reviewStatus: 1, publishStatus: 1 },
      order: { sort: 'DESC', createTime: 'DESC' },
    });
    return list.map(plugin => this.publicPluginPayload(plugin));
  }

  async checkUpdates(installed: InstalledPlugin[] = []) {
    const installedMap = new Map(
      (Array.isArray(installed) ? installed : [])
        .filter(item => item?.code)
        .map(item => [item.code, item.version || '0.0.0'])
    );

    const published = await this.pluginRepo.find({
      where: { reviewStatus: 1, publishStatus: 1 },
      order: { sort: 'DESC', createTime: 'DESC' },
    });

    const updates = published
      .filter(plugin => {
        const current = installedMap.get(plugin.code);
        return current && this.compareVersion(plugin.version, current) > 0;
      })
      .map(plugin => this.publicPluginPayload(plugin));

    return { list: updates };
  }

  private normalizePluginPayload(item: any) {
    if (!item || typeof item !== 'object') {
      return;
    }

    if (item.pluginJson && typeof item.pluginJson === 'string') {
      try {
        item.pluginJson = JSON.parse(item.pluginJson);
      } catch {
        throw new CoolCommException('plugin.json 格式不正确');
      }
    }

    const manifest = item.pluginJson || {};
    const fields = [
      'code',
      'name',
      'version',
      'entry',
      'icon',
      'minAppVersion',
      'checksum',
    ];

    for (const field of fields) {
      if (!item[field] && manifest[field]) {
        item[field] = manifest[field];
      }
    }

    if (!item.packageUrl && manifest.packageUrl) {
      item.packageUrl = manifest.packageUrl;
    }

    if (!item.permissions && manifest.permissions) {
      item.permissions = manifest.permissions;
    }

    item.permissions = this.normalizePermissions(item.permissions);
    item.config = item.config || {};
  }

  private checkPluginPayload(item: Partial<ToolboxPluginEntity>) {
    if (!item.code || !/^[a-z][a-z0-9-]{1,78}$/.test(item.code)) {
      throw new CoolCommException(
        '插件编码需以小写字母开头，仅支持小写字母、数字和短横线'
      );
    }

    if (!item.name || !item.version || !item.entry) {
      throw new CoolCommException('插件名称、版本号和入口地址不能为空');
    }

    if (!this.isSafeEntry(item.entry)) {
      throw new CoolCommException(
        '插件入口仅允许可信 HTTPS 或 /plugins/ 相对路径'
      );
    }

    const permissions = this.normalizePermissions(item.permissions);
    const invalid = permissions.find(
      permission => !ALLOWED_PLUGIN_PERMISSIONS.has(permission)
    );
    if (invalid) {
      throw new CoolCommException(`暂不支持插件权限：${invalid}`);
    }
    item.permissions = permissions;
  }

  private async getPlugin(id: number) {
    const plugin = await this.pluginRepo.findOneBy({ id: Number(id) });
    if (!plugin) {
      throw new CoolCommException('插件不存在');
    }
    return plugin;
  }

  private async ensurePluginCategory() {
    let category = await this.categoryRepo.findOne({
      where: { code: 'plugin' },
    });

    if (!category) {
      category = await this.categoryRepo.save({
        name: '插件',
        code: 'plugin',
        icon: '插',
        sort: 15,
        status: 1,
        remark: '系统自动创建，用于归类第三方 Web 沙箱插件',
      });
    }

    return category;
  }

  private normalizePermissions(value: unknown) {
    if (Array.isArray(value)) {
      return value.map(item => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  private parseManifest(content: string): UploadedManifest {
    try {
      return JSON.parse(content);
    } catch {
      throw new CoolCommException('plugin.json 格式不正确');
    }
  }

  private normalizeZipEntry(entryName: string) {
    const normalized = String(entryName || '')
      .replace(/\\/g, '/')
      .replace(/^\.\/+/, '');

    if (
      !normalized ||
      normalized.startsWith('/') ||
      normalized.includes('\0')
    ) {
      throw new CoolCommException('插件包文件路径不合法');
    }

    const parts = normalized.split('/').filter(Boolean);
    for (const part of parts) {
      let decoded = part;
      try {
        decoded = decodeURIComponent(part);
      } catch {
        decoded = part;
      }
      if (decoded === '..' || part === '..') {
        throw new CoolCommException('插件包不允许包含路径穿越');
      }
    }

    return parts.join('/');
  }

  private extractPackage(zip: any, code: string, version: string) {
    const root = pToolboxPluginPath();
    const pluginRoot = path.join(root, code);
    const targetDir = path.join(pluginRoot, version);
    const tempDir = path.join(pluginRoot, `${version}.${Date.now()}.tmp`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) {
          continue;
        }

        const safeName = this.normalizeZipEntry(entry.entryName);
        const target = path.resolve(tempDir, safeName);
        if (!target.startsWith(path.resolve(tempDir) + path.sep)) {
          throw new CoolCommException('插件包文件路径不合法');
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, entry.getData());
      }

      fs.rmSync(targetDir, { recursive: true, force: true });
      fs.renameSync(tempDir, targetDir);
    } catch (err) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw err;
    }
  }

  private writePackage(buffer: Buffer, code: string, version: string) {
    const pluginRoot = path.join(pToolboxPluginPath(), code);
    fs.mkdirSync(pluginRoot, { recursive: true });
    fs.writeFileSync(path.join(pluginRoot, `${version}.zip`), buffer);
  }

  private isSafeEntry(entry: string) {
    if (entry.startsWith('/plugins/')) {
      try {
        const url = new URL(entry, 'https://tool.baotounews.cn');
        return (
          url.pathname.startsWith('/plugins/') &&
          !entry.includes('\\') &&
          !url.pathname
            .split('/')
            .some(item => decodeURIComponent(item) === '..')
        );
      } catch {
        return false;
      }
    }

    try {
      const url = new URL(entry);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private publicPluginPayload(plugin: ToolboxPluginEntity) {
    return {
      code: plugin.code,
      name: plugin.name,
      description: plugin.description,
      icon: plugin.icon,
      version: plugin.version,
      entry: plugin.entry,
      packageUrl: plugin.packageUrl,
      checksum: plugin.checksum,
      permissions: this.normalizePermissions(plugin.permissions),
      minAppVersion: plugin.minAppVersion,
      changelog: plugin.changelog,
      sort: plugin.sort,
    };
  }

  private toolCode(code: string) {
    return `plugin-${code}`;
  }

  private compareVersion(next: string, current: string) {
    const a = this.parseVersion(next);
    const b = this.parseVersion(current);
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const diff = (a[i] || 0) - (b[i] || 0);
      if (diff !== 0) {
        return diff;
      }
    }
    return 0;
  }

  private parseVersion(version: string) {
    return String(version || '0')
      .split(/[.-]/)
      .map(item => Number(item))
      .map(item => (Number.isFinite(item) ? item : 0));
  }
}
