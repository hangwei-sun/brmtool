import { contextBridge, ipcRenderer } from 'electron'

type PluginRequestPayload = {
  path: string
  method?: 'GET' | 'POST'
  data?: unknown
}

function readPluginCode() {
  try {
    const value = new URLSearchParams(window.location.search).get('brmtoolPlugin') || ''
    return /^[a-z][a-z0-9-]{1,78}$/.test(value) ? value : 'unknown'
  } catch {
    return 'unknown'
  }
}

const pluginCode = readPluginCode()
const storagePrefix = `brmtool.plugin.${pluginCode}.`

const pluginApi = {
  getUser: () => ipcRenderer.invoke('plugin:get-user'),
  request: (payload: PluginRequestPayload) =>
    ipcRenderer.invoke('plugin:request', { ...payload, pluginCode }),
  storage: {
    getItem(key: string) {
      return localStorage.getItem(`${storagePrefix}${key}`)
    },
    setItem(key: string, value: string) {
      localStorage.setItem(`${storagePrefix}${key}`, value)
      return true
    },
    removeItem(key: string) {
      localStorage.removeItem(`${storagePrefix}${key}`)
      return true
    }
  }
}

contextBridge.exposeInMainWorld('brmtoolPlugin', pluginApi)
