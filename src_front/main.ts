import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { storeMain as useStoreMain } from './store/main/storeMain'
import './less/index.less';

const app = createApp(App);
app.use(createPinia());

const storeMain = useStoreMain();

router.beforeEach(async (to) => {
	if (storeMain.initComplete) return;
	try {
		await storeMain.startApp(to);
	}catch(e) {
		console.log(e);
		return {name:"home"};
	}
});

app.use(router);
app.mount('#app');
