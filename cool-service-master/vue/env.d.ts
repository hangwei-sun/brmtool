/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_NAME: string;
	readonly VITE_TIMEOUT: number;
	readonly VITE_DESKTOP_DOWNLOAD_MAC_URL: string;
	readonly VITE_DESKTOP_DOWNLOAD_WINDOWS_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
