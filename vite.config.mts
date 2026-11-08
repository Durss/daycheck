import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	server: {
		//API is served by the express server (npm run server/watch + node server/bootstrap.js)
		proxy: {
			'/api': 'http://localhost:3003',
		},
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src_front', import.meta.url))
		}
	},
	css: {
		preprocessorOptions: {
			less: {
				additionalData: `@import (reference) "@/less/index.less";@import (reference) "@/less/_includes.less";`
			}
		}
	}
});
