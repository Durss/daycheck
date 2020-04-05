import router from '@/router';
import Config from '@/utils/Config';
import DataMigrator from '@/utils/DataMigrator';
import Vue from 'vue';
import Vuex from 'vuex';
import Utils from '../utils/Utils';

Vue.use(Vuex)

let startPromise: Promise<any>;

export default new Vuex.Store({
	state: {
		initComplete: false,
		mobile: false,
		tooltip: null,
		alert: null,
		data: {
			name:null,
			description:null,
			days:null,
			daysDone:null,
		},
		confirm:{
		  title:null,
		  description:null,
		  confirmCallback:null,
		  cancelCallback:null,
		}
	},





	mutations: {

		initComplete(state) { state.initComplete = true; },
		
		confirm(state, payload) { state.confirm = payload; },

		setData(state, payload) { state.data = payload; },

		alert(state, payload) { state.alert = payload; },

		createCalendar(state, payload) {
			state.data.daysDone = [];
			state.data.days = payload.days;
			state.data.name = payload.name;
			state.data.description = payload.description;
			let dataurl = Utils.encodeForURI(payload);
			router.push({name:"calendar", params:{title:Utils.slugify(state.data.name), dataurl:dataurl}});
		},

		checkDate(state, payload) {
			if(!state.data.daysDone) state.data.daysDone = [];
			let v = payload.value? state.data.daysDone[payload.index]+1 : 0
			Vue.set(state.data.daysDone, payload.index, v);
			let dataurl = Utils.encodeForURI(state.data);
			router.push({name:"calendar", params:{title:Utils.slugify(state.data.name), dataurl:dataurl}});
		}

	},






	actions: {
		startApp({ commit, state, dispatch }, payload) {
			//Security to make sure startApp isn't executed twice if changing URL while loading
			if (startPromise && payload.force !== true) return startPromise;
			if(payload.to.name == "calendar") {
				try {
					let data = Utils.decodeFromURI(payload.to.params.dataurl);
					let needsUpdate = data.v != Config.DATA_VERSION;
					if(needsUpdate) {
						new DataMigrator().migrate(data);
					}
					commit("setData", data);
					if(needsUpdate) {
						//Update URI with new data
						let dataurl = Utils.encodeForURI(state.data);
						router.push({name:"calendar", params:{title:Utils.slugify(state.data.name), dataurl:dataurl}});
					}
					console.log(data);
				}catch(e) {
					console.log(e);
					commit("alert", "Unable to parse calendar data :(");
					return Promise.reject(e);
				}
			}
			
			startPromise = new Promise(async (resolve, reject) => {
				commit("initComplete", true);
				resolve();
			});

			return startPromise;
		},

		alert({ commit }, payload) { commit("alert", payload); },

		setMobileState({ state }, payload) { state.mobile = payload; },

		openTooltip({state}, payload) { state.tooltip = payload; },
		
		closeTooltip({state}) { state.tooltip = null; },

		confirm({commit}, payload) { commit("confirm", payload); },

		createCalendar({commit}, payload) { commit("createCalendar", payload); },

		checkDate({commit}, payload) { commit("checkDate", payload); },
	}
})
