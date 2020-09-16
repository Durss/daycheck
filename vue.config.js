module.exports = {

    configureWebpack: {
		resolve: {
			alias: {
				'@': __dirname + '/src_front'
			}
		},
		entry: {
			app: './src_front/main.ts'
		},
	},
	css: {
		loaderOptions: {
			less: {
				additionalData: `@import (reference) "@/less/index.less";@import (reference) "@/less/_includes.less";`
			}
		}
	}
}