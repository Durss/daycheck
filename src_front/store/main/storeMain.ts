import router from '@/router';
import Config from '@/utils/Config';
import DataMigrator from '@/utils/DataMigrator';
import Utils from '@/utils/Utils';
import type CalendarData from '@/vo/CalendarData';
import { defineStore } from 'pinia';
import type { RouteLocationNormalized } from 'vue-router';

let startPromise: Promise<any>;

export interface ConfirmData {
	title:string;
	description:string;
	confirmCallback:()=>void;
	cancelCallback:()=>void;
}

export const storeMain = defineStore("main", {
	state: () => ({
		initComplete: false,
		mobile: false,
		tooltip: null as string|null,
		alert: null as string|null,
		calendars: null as CalendarData[]|null,
		data: null as CalendarData|null,
		confirm: {
			title:null,
			description:null,
			confirmCallback:null,
			cancelCallback:null,
		} as ConfirmData|null,
	}),





	actions: {
		startApp(to:RouteLocationNormalized, force:boolean = false):Promise<any> {
			//Security to make sure startApp isn't executed twice if changing URL while loading
			if (startPromise && force !== true) return startPromise;

			let data = localStorage.getItem("calendars");
			if(data) {
				this.calendars = JSON.parse(data);
			}

			if(to.name == "calendar") {
				if(to.params.dataurl) {
					//Old data loading from URL, migrate it to local storage
					try {
						let data = Utils.decodeFromURI(to.params.dataurl as string);
						let needsUpdate = data.v != Config.DATA_VERSION;
						if(needsUpdate) {
							new DataMigrator().migrate(data);
						}
						data.id = Utils.uuid();
						this.setData(data);
						router.push({name:'calendar', params:{id:data.id}});
					}catch(e) {
						console.log(e);
						this.alert = "Unable to parse calendar data :(";
						return Promise.reject(e);
					}

				}else{

					//New data format, loading from local storage
					let calendars:CalendarData[] = JSON.parse(localStorage.getItem("calendars"));
					let data:CalendarData;
					for (let i = 0; i < calendars.length; i++) {
						if(calendars[i].id == to.params.id) {
							data = calendars[i];
						}
						if(calendars[i].v != Config.DATA_VERSION) {
							try {
								//Migrate data if necessary
								new DataMigrator().migrate(calendars[i]);
							}catch(e) {/*ignore*/}
						}
					}
					this.setData(data);
				}
			}

			this.initComplete = true;
			startPromise = Promise.resolve(null);

			return startPromise;
		},

		openTooltip(payload:string) { this.tooltip = payload; },

		closeTooltip() { this.tooltip = null; },

		createCalendar(payload:{name:string, days:number, description:string}) {
			this.data = {
				id: Utils.uuid(),
				daysDone: [],
				days: payload.days,
				name: payload.name,
				start: new Date().toISOString(),
				description: payload.description,
			} as CalendarData;
			this.setData(this.data);
			router.push({name:"calendar", params:{id:this.data.id}});
		},

		setData(payload:CalendarData) {
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
			this.data = payload;
			this.calendars = list;
		},

		checkDate(index:number) {
			if(!this.data.daysDone) this.data.daysDone = [];
			if(!this.data.daysDone[index]) this.data.daysDone[index] = 0;

			let v = this.data.daysDone[index]+1;
			if(v > 5) v = 0;
			this.data.daysDone[index] = v;
			this.setData(this.data);
		},

		deleteCalendar(id:string) {
			if(this.data && this.data.id == id) {
				router.push({name:"home"});
			}
			let list:CalendarData[] = this.calendars;
			for (let i = 0; i < list.length; i++) {
				const c = list[i];
				if(c.id == id) {
					list.splice(i, 1);
				}
			}
			localStorage.setItem("calendars", JSON.stringify(list));
		},
	}
})
