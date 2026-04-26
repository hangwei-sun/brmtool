#!/usr/bin/env node

'use strict';

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const readline = require('node:readline');

const ROOT_DIR = __dirname;
const API_DIR = path.join(ROOT_DIR, 'api');
const VUE_DIR = path.join(ROOT_DIR, 'vue');
const API_PORT = 8001;
const VUE_FALLBACK_URL = 'http://127.0.0.1:9000/';
const PNPM_VERSION = '10.23.0';
const STARTUP_TIMEOUT_MS = 120000;
const DEV_CHILDREN = new Set();

let isShuttingDown = false;

function log(message) {
  console.log(`[launcher] ${message}`);
}

function error(message) {
  console.error(`[launcher] ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function commandName(name) {
  return name;
}

function shouldUseShell() {
  return process.platform === 'win32';
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function ensureProject(projectName, projectDir) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`未找到 ${projectName} 项目: ${packageJsonPath}`);
  }
}

function hasInstalledDependencies(projectDir) {
  const nodeModulesDir = path.join(projectDir, 'node_modules');
  const pnpmModulesFile = path.join(nodeModulesDir, '.modules.yaml');
  const pnpmStoreDir = path.join(nodeModulesDir, '.pnpm');

  return (
    fs.existsSync(nodeModulesDir) &&
    (fs.existsSync(pnpmModulesFile) || fs.existsSync(pnpmStoreDir))
  );
}

function commandVersion(command) {
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: shouldUseShell(),
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  return (result.stdout || result.stderr || '').trim() || null;
}

function attachOutput(stream, tag, writer, onLine) {
  if (!stream) return;

  const rl = readline.createInterface({ input: stream });
  rl.on('line', line => {
    const text = String(line);
    writer(`[${tag}] ${text}`);
    if (onLine) {
      onLine(text);
    }
  });
}

function spawnCommand({
  label,
  command,
  args,
  cwd,
  detached = false,
  onStdout,
  onStderr,
}) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: shouldUseShell(),
    windowsHide: false,
    detached,
  });

  attachOutput(child.stdout, label, console.log, onStdout);
  attachOutput(child.stderr, label, console.error, onStderr);

  return child;
}

function waitForExit(child, label) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${label} 执行失败，退出码: ${code === null ? 'null' : code}${
            signal ? `，信号: ${signal}` : ''
          }`
        )
      );
    });
  });
}

async function runStep(label, cwd, runner, ...runnerArgs) {
  log(`开始 ${label}`);
  const child = spawnCommand({
    label,
    command: runner.command,
    args: [...runner.baseArgs, ...runnerArgs],
    cwd,
  });
  await waitForExit(child, label);
  log(`${label} 完成`);
}

function canConnect(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });

    const finish = result => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(800);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function ensurePortFree(port, label) {
  if (await canConnect(port)) {
    throw new Error(`${label} 需要的端口 ${port} 已被占用，请先释放后再运行脚本`);
  }
}

function createExitWatcher(child, label) {
  let exitInfo = null;

  child.once('error', err => {
    exitInfo = { error: err };
  });

  child.once('exit', (code, signal) => {
    exitInfo = { code, signal };
  });

  return () => exitInfo;
}

async function waitForPortReady(child, label, port, timeoutMs) {
  const getExitInfo = createExitWatcher(child, label);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const exitInfo = getExitInfo();
    if (exitInfo) {
      if (exitInfo.error) {
        throw exitInfo.error;
      }

      throw new Error(
        `${label} 在端口 ${port} 就绪前已退出，退出码: ${
          exitInfo.code === null ? 'null' : exitInfo.code
        }${exitInfo.signal ? `，信号: ${exitInfo.signal}` : ''}`
      );
    }

    if (await canConnect(port)) {
      return;
    }

    await sleep(1000);
  }

  throw new Error(`${label} 在 ${timeoutMs / 1000} 秒内没有成功启动`);
}

function extractUrl(line) {
  const clean = stripAnsi(line);
  const match = clean.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

async function waitForVueReady(child, getVueUrl, timeoutMs) {
  const getExitInfo = createExitWatcher(child, 'vue');
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const exitInfo = getExitInfo();
    if (exitInfo) {
      if (exitInfo.error) {
        throw exitInfo.error;
      }

      throw new Error(
        `vue 在启动完成前已退出，退出码: ${
          exitInfo.code === null ? 'null' : exitInfo.code
        }${exitInfo.signal ? `，信号: ${exitInfo.signal}` : ''}`
      );
    }

    const url = getVueUrl();
    if (url) {
      return url;
    }

    if (await canConnect(9000)) {
      return VUE_FALLBACK_URL;
    }

    await sleep(1000);
  }

  throw new Error(`vue 在 ${timeoutMs / 1000} 秒内没有成功启动`);
}

function trackDevChild(child) {
  DEV_CHILDREN.add(child);
  child.once('exit', () => {
    DEV_CHILDREN.delete(child);
  });
}

function stopDevChild(child) {
  return new Promise(resolve => {
    if (!child || child.killed || child.exitCode !== null) {
      resolve();
      return;
    }

    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        shell: false,
        windowsHide: true,
      });

      killer.once('error', () => resolve());
      killer.once('exit', () => resolve());
      return;
    }

    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch (err) {
      try {
        child.kill('SIGTERM');
      } catch (killErr) {
        resolve();
        return;
      }
    }

    child.once('exit', () => resolve());
    setTimeout(() => resolve(), 5000);
  });
}

async function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  log('正在停止 api 和 vue 进程...');
  await Promise.all(Array.from(DEV_CHILDREN, child => stopDevChild(child)));
  process.exit(exitCode);
}

function openBrowser(url) {
  let command;
  let args;

  if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const child = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
    shell: false,
    windowsHide: true,
  });

  child.unref();
}

async function ensurePnpm() {
  const pnpm = commandName('pnpm');
  const installedVersion = commandVersion(pnpm);
  if (installedVersion) {
    log(`检测到 pnpm ${installedVersion}`);
    return { command: pnpm, baseArgs: [] };
  }

  log('未检测到 pnpm，开始自动安装');

  const corepack = commandName('corepack');
  if (commandVersion(corepack)) {
    await runStep('启用 corepack pnpm', ROOT_DIR, {
      command: corepack,
      baseArgs: ['enable', 'pnpm'],
    });
    await runStep('安装 pnpm', ROOT_DIR, {
      command: corepack,
      baseArgs: ['prepare', `pnpm@${PNPM_VERSION}`, '--activate'],
    });

    const preparedVersion = commandVersion(pnpm);
    if (preparedVersion) {
      log(`pnpm 安装完成，当前版本 ${preparedVersion}`);
      return { command: pnpm, baseArgs: [] };
    }
  }

  const npm = commandName('npm');
  if (commandVersion(npm)) {
    await runStep('通过 npm 全局安装 pnpm', ROOT_DIR, {
      command: npm,
      baseArgs: ['install', '-g', `pnpm@${PNPM_VERSION}`],
    });

    const npmInstalledVersion = commandVersion(pnpm);
    if (npmInstalledVersion) {
      log(`pnpm 安装完成，当前版本 ${npmInstalledVersion}`);
      return { command: pnpm, baseArgs: [] };
    }
  }

  throw new Error(
    'pnpm 自动安装失败。请先确认当前环境能使用 corepack 或 npm，再重新运行 start-dev.js'
  );
}

function watchUnexpectedExit(child, label) {
  return new Promise((_, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (isShuttingDown) {
        return;
      }

      reject(
        new Error(
          `${label} 已退出，退出码: ${code === null ? 'null' : code}${
            signal ? `，信号: ${signal}` : ''
          }`
        )
      );
    });
  });
}

async function main() {
  ensureProject('api', API_DIR);
  ensureProject('vue', VUE_DIR);

  const pnpm = await ensurePnpm();

  if (hasInstalledDependencies(API_DIR)) {
    log('检测到 api 依赖已安装，跳过安装');
  } else {
    await runStep('安装 api 依赖', API_DIR, pnpm, 'install');
  }

  if (hasInstalledDependencies(VUE_DIR)) {
    log('检测到 vue 依赖已安装，跳过安装');
  } else {
    await runStep('安装 vue 依赖', VUE_DIR, pnpm, 'install');
  }

  await ensurePortFree(API_PORT, 'api');

  log('启动 api 项目...');
  const apiChild = spawnCommand({
    label: 'api',
    command: pnpm.command,
    args: [...pnpm.baseArgs, 'dev'],
    cwd: API_DIR,
    detached: process.platform !== 'win32',
  });
  trackDevChild(apiChild);

  await waitForPortReady(apiChild, 'api', API_PORT, STARTUP_TIMEOUT_MS);
  log(`api 已启动: http://127.0.0.1:${API_PORT}`);

  log('启动 vue 项目...');
  let vueUrl = null;
  const vueChild = spawnCommand({
    label: 'vue',
    command: pnpm.command,
    args: [...pnpm.baseArgs, 'dev'],
    cwd: VUE_DIR,
    detached: process.platform !== 'win32',
    onStdout: line => {
      const clean = stripAnsi(line);
      if (/Local:/i.test(clean)) {
        vueUrl = extractUrl(clean) || vueUrl;
        return;
      }

      if (!vueUrl) {
        vueUrl = extractUrl(clean) || null;
      }
    },
    onStderr: line => {
      if (!vueUrl) {
        vueUrl = extractUrl(stripAnsi(line)) || null;
      }
    },
  });
  trackDevChild(vueChild);

  const finalVueUrl = await waitForVueReady(
    vueChild,
    () => vueUrl,
    STARTUP_TIMEOUT_MS
  );

  log(`vue 已启动: ${finalVueUrl}`);

  try {
    openBrowser(finalVueUrl);
    log(`已尝试打开默认浏览器: ${finalVueUrl}`);
  } catch (err) {
    error(`打开浏览器失败，请手动访问: ${finalVueUrl}`);
  }

  log('开发环境已就绪，按 Ctrl+C 可同时停止 api 和 vue');

  await Promise.race([
    watchUnexpectedExit(apiChild, 'api'),
    watchUnexpectedExit(vueChild, 'vue'),
  ]);
}

process.on('SIGINT', () => {
  shutdown(0).catch(err => {
    error(err.message);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown(0).catch(err => {
    error(err.message);
    process.exit(1);
  });
});

main().catch(async err => {
  error(err.message);
  await shutdown(1);
});
