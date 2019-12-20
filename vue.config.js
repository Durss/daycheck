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
				data: `@import "@/less/index.less";`
			}
		}
	}
}