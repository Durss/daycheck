import router from '@/router';
import Config from '@/utils/Config';
import DataMigrator from '@/utils/DataMigrator';
import Vue from 'vue';
import Vuex from 'vuex';
import Utils from '../utils/Utils';
import CalendarData from '@/vo/CalendarData';
import { v4 as uuidv4 } from 'uuid';

Vue.use(Vuex)

let startPromise: Promise<any>;

export default new Vuex.Store({
	state: {
		initComplete: false,
		mobile: false,
		tooltip: null,
		alert: null,
		calendars: null,
		data: null,
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

		setData(state, payload) {
			let data = localStorage.getItem("calendars");
			let list:CalendarData[] = [];
			if(data) {
				list = JSON.parse(data);
			}
			let found:boolean = false;
			for (let i = 0; i < list.length; i++) {
				const l = list[i];
				if(l.id == payload.id) {
					found = true;
					list[i] = payload;
				}
			}
			if(!found) {
				list.push(payload);
			}
			localStorage.setItem("calendars", JSON.stringify(list));
			state.data = payload;
			state.calendars = list;
		},

		alert(state, payload) { state.alert = payload; },

		createCalendar(state, payload) {
			let data = {
				id: uuidv4(),
				daysDone: [],
				days: payload.days,
				name: payload.name,
				start: new Date(),
				description: payload.description,
			};
			state.data = data;
		},

		checkDate(state, payload) {
			if(!state.data.daysDone) state.data.daysDone = [];
			if(!state.data.daysDone[payload.index]) state.data.daysDone[payload.index] = 0;

			let v = state.data.daysDone[payload.index]+1;
			if(v > 5) v = 0;
			Vue.set(state.data.daysDone, payload.index, v);
		}

	},






	actions: {
		startApp({ commit, state, dispatch }, payload) {
			//Security to make sure startApp isn't executed twice if changing URL while loading
			if (startPromise && payload.force !== true) return startPromise;

			let data = localStorage.getItem("calendars");
			if(data) {
				state.calendars = JSON.parse(data);
			}
			
			if(payload.to.name == "calendar") {
				if(payload.to.params.dataurl) {
					//Old data loading from URL, migrate it to local storage
					try {
						let data = Utils.decodeFromURI(payload.to.params.dataurl);
						let needsUpdate = data.v != Config.DATA_VERSION;
						if(needsUpdate) {
							new DataMigrator().migrate(data);
						}
						data.id = uuidv4();
						commit("setData", data);
						router.push({name:'calendar', params:{id:data.id}});
					}catch(e) {
						console.log(e);
						commit("alert", "Unable to parse calendar data :(");
						return Promise.reject(e);
					}

				}else{

					//New data format, loading from local storage
					let calendars = JSON.parse(localStorage.getItem("calendars"));
					let data;
					for (let i = 0; i < calendars.length; i++) {
						if(calendars[i].id == payload.to.params.id) {
							data = calendars[i];
						}
						if(calendars[i].v != Config.DATA_VERSION) {
							try {
								//Migrate data if necessary
								new DataMigrator().migrate(calendars[i]);
							}catch(e) {/*ignore*/}
						}
					}
					commit("setData", data);
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

		createCalendar({commit, state}, payload) {
			commit("createCalendar", payload);
			commit("setData", state.data);
			router.push({name:"calendar", params:{id:state.data.id}});
		},
		
		setData({commit}, payload) { commit("setData", payload); },

		checkDate({commit, state}, payload) {
			commit("checkDate", payload);
			commit("setData", state.data);
		},
	}
})
