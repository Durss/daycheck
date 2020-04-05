import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './less/index.less';

Vue.config.productionTip = false;

router.beforeEach((to, from, next) => {
	if (!store.state.initComplete) {
		store.dispatch("startApp", {router, to}).then(_=> {
			next();
		}).catch((e)=> {
			console.log(e);
			router.push({name:"home"});
		});
	}else{
		next();
	}
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
