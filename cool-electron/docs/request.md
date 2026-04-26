# HTTP 请求模块

## 模块说明

`src/main/request/` 模块演示如何在 **Main 进程**发起外部 HTTP 请求，并通过 IPC 将结果返回给 Renderer。

**核心优势**：Main 进程不受浏览器同源策略（CORS）限制，可以直接请求任意外部接口，是 Electron 中处理跨域 API 调用的推荐方式。

**模块文件：** `src/main/request/index.ts`  
**注册入口：** `src/main/index.ts`  
**Preload 桥接：** `src/preload/index.ts`  
**Renderer 类型：** `src/preload/index.d.ts`

---

## Channel 列表

| Channel | 方向 | 类型 | 说明 |
|---------|------|------|------|
| `request:fetch` | Renderer → Main | `invoke / handle` | 发起 HTTP 请求，返回状态码、耗时和响应体 |

---

## request:fetch

### 说明

由 Main 进程使用 Node.js 原生 `fetch`（Node 18+）发起 HTTP 请求，支持超时控制和自动 JSON 解析。

### Renderer 调用

```typescript
const result = await window.api.fetchUrl('https://api.example.com/data')

if (result.success) {
  console.log(result.status)     // 200
  console.log(result.statusText) // "OK"
  console.log(result.elapsed)    // 123（毫秒）
  console.log(result.data)       // 响应体（已解析为 JSON 对象或字符串）
} else {
  console.error(result.error)    // 错误信息
}
```

### 入参结构

```typescript
{
  url: string       // 请求地址（必须以 http:// 或 https:// 开头）
  method?: string   // 请求方法，默认 'GET'
}
```

### 返回值结构

```typescript
interface FetchResult {
  success: boolean
  status?: number       // HTTP 状态码（200, 404 等）
  statusText?: string   // 状态描述（"OK", "Not Found" 等）
  elapsed?: number      // 请求耗时（毫秒）
  data?: unknown        // 响应体（JSON 自动解析，其他为字符串）
  error?: string        // 失败时的错误信息
}
```

### 超时机制

请求超过 **10 秒**自动中止，返回 `{ success: false, error: '请求超时（超过 10s）' }`。

---

## 注册方式

```typescript
// src/main/index.ts
import { registerRequestHandlers } from './request'

app.whenReady().then(() => {
  registerRequestHandlers()  // 无需传入 mainWindow
})
```

---

## 与 Renderer 直接 fetch 的区别

| 对比项 | Renderer fetch | Main 进程 fetch（本模块）|
|--------|---------------|----------------------|
| CORS 限制 | 受限，跨域需服务端支持 | 无限制，可请求任意接口 |
| 请求来源 | 浏览器 User-Agent | 自定义 User-Agent |
| 适用场景 | 同源或已配置 CORS 的接口 | 任意外部 API |

---

## 扩展建议

| Channel（建议命名） | 说明 |
|---------------------|------|
| `request:fetch-with-headers` | 支持自定义请求头（如 Authorization） |
| `request:post` | POST 请求，支持 JSON body |
| `request:download` | 下载文件到本地，返回进度推送 |
