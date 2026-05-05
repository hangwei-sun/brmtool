import { CoolConfig } from '@cool-midway/core';
import { MidwayConfig } from '@midwayjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { entities } from '../entities';
import { TenantSubscriber } from '../modules/base/db/tenant';

function loadProductionEnv() {
  const files = [
    path.join(__dirname, '../../.env.production'),
    path.join(__dirname, '../../../.env.production'),
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const text = line.trim();
      if (!text || text.startsWith('#')) {
        continue;
      }

      const index = text.indexOf('=');
      if (index <= 0) {
        continue;
      }

      const key = text.slice(0, index).trim();
      const value = text
        .slice(index + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadProductionEnv();

const prodPort = Number(process.env.BRMTOOL_PORT || 8001);
const dbPort = Number(process.env.BRMTOOL_DB_PORT || 3306);

/**
 * 本地开发 npm run prod 读取的配置文件
 */
export default {
  koa: {
    port: prodPort,
  },
  typeorm: {
    dataSource: {
      default: {
        type: 'mysql',
        host: process.env.BRMTOOL_DB_HOST || '127.0.0.1',
        port: dbPort,
        username: process.env.BRMTOOL_DB_USER || 'root',
        password:
          process.env.BRMTOOL_DB_PASSWORD || process.env.MYSQL_PWD || '',
        database: process.env.BRMTOOL_DB_NAME || 'brmtool',
        // 自动建表 注意：线上部署的时候不要使用，有可能导致数据丢失
        synchronize: false,
        // 打印日志
        logging: false,
        // 字符集
        charset: 'utf8mb4',
        // 是否开启缓存
        cache: true,
        // 实体路径
        entities,
        // 订阅者
        subscribers: [TenantSubscriber],
      },
    },
  },
  cool: {
    // 实体与路径，跟生成代码、前端请求、swagger文档相关 注意：线上不建议开启，以免暴露敏感信息
    eps: false,
    // 是否自动导入模块数据库
    initDB: false,
    // 判断是否初始化的方式
    initJudge: 'db',
    // 是否自动导入模块菜单
    initMenu: false,
  } as CoolConfig,
} as MidwayConfig;
