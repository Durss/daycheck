import router from '@/router';
import Api, { ApiError } from '@/utils/Api';
import Config from '@/utils/Config';
import DataMigrator from '@/utils/DataMigrator';
import DateUtils from '@/utils/DateUtils';
import Utils from '@/utils/Utils';
import { CALENDAR_LIMITS } from '@/vo/CalendarData';
import type CalendarData from '@/vo/CalendarData';
import { defineStore } from 'pinia';
import type { RouteLocationNormalized } from 'vue-router';

let startPromise: Promise<any>;

/** Local cache of the calendars */
const LS_CALENDARS = "calendars";
/** IDs of calendars with local changes not yet saved on the server */
const LS_DIRTY = "calendars_dirty";
/** Delay before pushing a change to the server, so quick successive changes are sent at once */
const PUSH_DELAY = 800;
/** Minimum delay between two syncs triggered by the page getting visible again */
const SYNC_MIN_INTERVAL = 10000;
/** Calendar IDs are lowercase v4 UUIDs (validated by the server) */
const ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

//Sync state, not reactive
const pushTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
/** Incremented on each local change to detect changes made while a request is pending */
const localRevs = new Map<string, number>();
let syncPromise:Promise<void> = null;
let lastSync = 0;

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
		calendars: [] as CalendarData[],
		dirty: [] as string[],
		currentId: null as string|null,
		confirm: {
			title:null,
			description:null,
			confirmCallback:null,
			cancelCallback:null,
		} as ConfirmData|null,
	}),



	getters: {
		/**
		 * Currently opened calendar
		 */
		data(state):CalendarData|null {
			return state.calendars.find(c => c.id == state.currentId) || null;
		},
	},



	actions: {
		startApp(to:RouteLocationNormalized, force:boolean = false):Promise<any> {
			//Security to make sure startApp isn't executed twice if changing URL while loading
			if (startPromise && force !== true) return startPromise;

			startPromise = (async () => {
				this.loadLocal();

				if(to.name == "calendar") {
					if(to.params.dataurl) {
						//Old data loading from URL (legacy QR codes), import it as a new calendar
						try {
							let data = Utils.decodeFromURI(to.params.dataurl as string);
							new DataMigrator().migrate(data);
							data.id = Utils.uuid();
							this.saveCalendar(data);
							router.push({name:'calendar', params:{id:data.id}});
						}catch(e) {
							console.log(e);
							this.alert = "Unable to parse calendar data :(";
							throw e;
						}

					}else{
						const id = to.params.id as string;
						if(!this.calendars.find(c => c.id == id)) {
							//Unknown calendar, probably opened from a link on another device
							//Load it from the server
							const remote = ID_REGEX.test(id)? await Api.getCalendar(id).catch(() => null) : null;
							if(!remote) throw new Error("Calendar not found");
							new DataMigrator().migrate(remote);
							this.calendars.push(remote);
							this.saveLocal();
						}
						this.currentId = id;
					}
				}

				this.initComplete = true;

				//Sync with server in background
				this.sync();
				document.addEventListener("visibilitychange", () => {
					if(document.visibilityState == "visible" && Date.now() - lastSync > SYNC_MIN_INTERVAL) {
						this.sync();
					}
					//Page hidden or closed, send pending changes right away
					if(document.visibilityState == "hidden") this.flushPending();
				});
				//Keep in sync with other tabs
				window.addEventListener("storage", (event) => {
					if(event.key == LS_CALENDARS || event.key == LS_DIRTY) this.loadLocal(false);
				});
			})();

			//Allow a new attempt (eg: after redirecting to home page)
			startPromise.catch(() => startPromise = null);

			return startPromise;
		},

		openTooltip(payload:string) { this.tooltip = payload; },

		closeTooltip() { this.tooltip = null; },

		openCalendar(id:string) {
			this.currentId = id;
		},

		createCalendar(payload:{name:string, days:number|null, description:string}) {
			const data:CalendarData = {
				id: Utils.uuid(),
				name: payload.name,
				description: payload.description,
				days: payload.days,
				start: DateUtils.todayKey(),
				checks: {},
				history: [],
				v: Config.DATA_VERSION,
			};
			this.saveCalendar(data);
			router.push({name:"calendar", params:{id:data.id}});
		},

		/**
		 * Updates some fields of the current calendar
		 */
		updateCalendar(payload:Partial<Pick<CalendarData, "name"|"description">>) {
			if(!this.data) return;
			Object.assign(this.data, payload);
			this.saveCalendar(this.data);
		},

		/**
		 * Cycles the check level of the given day ("YYYY-MM-DD") on the current calendar
		 */
		checkDate(date:string) {
			const data = this.data;
			if(!data) return;
			if(!data.checks) data.checks = {};
			let v = (data.checks[date] || 0) + 1;
			if(v > 5) v = 0;
			if(v == 0) {
				delete data.checks[date];
			}else{
				data.checks[date] = v;
			}
			this.saveCalendar(data);
		},

		/**
		 * Archives the current run and starts a new one.
		 * If the current run isn't over yet (restarting on its last day),
		 * the new run starts the next day so the runs don't overlap.
		 */
		restartCalendar() {
			const data = this.data;
			//Endless challenges never end
			if(!data || !data.days) return;
			const today = DateUtils.todayKey();
			const lastDay = DateUtils.addDays(data.start, data.days - 1);
			if(!data.history) data.history = [];
			data.history.push({start:data.start, days:data.days});
			data.start = today > lastDay? today : DateUtils.addDays(lastDay, 1);
			this.saveCalendar(data);
		},

		deleteCalendar(id:string) {
			if(this.currentId == id) {
				router.push({name:"home"});
			}
			clearTimeout(pushTimeouts.get(id));
			this.calendars = this.calendars.filter(c => c.id != id);
			this.dirty = this.dirty.filter(v => v != id);
			this.saveLocal();
			Api.deleteCalendar(id).catch(error => console.warn("Unable to delete calendar from server", error));
		},

		/**
		 * Saves a calendar locally and schedules its upload to the server
		 */
		saveCalendar(data:CalendarData) {
			const index = this.calendars.findIndex(c => c.id == data.id);
			if(index == -1) this.calendars.push(data);
			else this.calendars[index] = data;
			localRevs.set(data.id, (localRevs.get(data.id) || 0) + 1);
			if(!this.dirty.includes(data.id)) this.dirty.push(data.id);
			this.saveLocal();

			clearTimeout(pushTimeouts.get(data.id));
			pushTimeouts.set(data.id, setTimeout(() => this.push(data.id), PUSH_DELAY));
		},

		/**
		 * Uploads a calendar to the server.
		 * Returns true if the server has the latest version.
		 */
		async push(id:string, keepalive:boolean = false):Promise<boolean> {
			clearTimeout(pushTimeouts.get(id));
			pushTimeouts.delete(id);
			const calendar = this.calendars.find(c => c.id == id);
			if(!calendar) return false;
			const rev = localRevs.get(id) || 0;
			try {
				const saved = await Api.putCalendar({
					...calendar,
					name: (calendar.name || "").substring(0, CALENDAR_LIMITS.name),
					description: (calendar.description || "").substring(0, CALENDAR_LIMITS.description),
				}, keepalive);
				//Only mark as saved if no change has been made in the meantime
				if((localRevs.get(id) || 0) == rev) {
					calendar.updatedAt = saved.updatedAt;
					this.dirty = this.dirty.filter(v => v != id);
					this.saveLocal();
				}
				return true;
			}catch(error) {
				//Calendar stays "dirty", it will be sent again on next sync
				console.warn("Unable to save calendar on server", error);
				if(error instanceof ApiError && error.status == 429 && error.retryAfter > 0) {
					pushTimeouts.set(id, setTimeout(() => this.push(id), Math.min(error.retryAfter, 120) * 1000));
				}
				return false;
			}
		},

		/**
		 * Immediately sends the changes waiting to be pushed
		 */
		flushPending() {
			for (const id of [...pushTimeouts.keys()]) this.push(id, true);
		},

		/**
		 * Sends local changes to the server and gets the latest version of other calendars
		 */
		sync():Promise<void> {
			if(syncPromise) return syncPromise;
			syncPromise = (async () => {
				for (const calendar of [...this.calendars]) {
					const id = calendar.id;
					if(this.dirty.includes(id)) {
						await this.push(id);
						continue;
					}
					const rev = localRevs.get(id) || 0;
					let remote:CalendarData;
					try {
						remote = await Api.getCalendar(id);
					}catch(error) {
						//Server unreachable, try again later
						if(!(error instanceof ApiError)) break;
						continue;
					}
					if(!remote) {
						//Not on the server yet (calendar created before server storage existed)
						await this.push(id);
						continue;
					}
					//Ignore server version if calendar has been modified in the meantime
					if((localRevs.get(id) || 0) != rev || this.dirty.includes(id)) continue;
					const index = this.calendars.findIndex(c => c.id == id);
					if(index == -1) continue;//Deleted in the meantime
					new DataMigrator().migrate(remote);
					if(JSON.stringify(remote) != JSON.stringify(this.calendars[index])) {
						this.calendars[index] = remote;
						this.saveLocal();
					}
				}
			})().finally(() => {
				syncPromise = null;
				lastSync = Date.now();
			});
			return syncPromise;
		},

		/**
		 * Loads calendars from local storage, migrating them if necessary
		 */
		loadLocal(migrate:boolean = true) {
			let calendars:CalendarData[] = [];
			let dirty:string[] = [];
			try {
				calendars = JSON.parse(localStorage.getItem(LS_CALENDARS)) || [];
				dirty = JSON.parse(localStorage.getItem(LS_DIRTY)) || [];
			}catch(e) {/*ignore*/}
			if(!Array.isArray(calendars)) calendars = [];
			if(!Array.isArray(dirty)) dirty = [];
			calendars = calendars.filter(c => c && typeof c == "object");

			if(migrate) {
				const migrator = new DataMigrator();
				const ids = new Set<string>();
				for (const c of calendars) {
					try {
						migrator.migrate(c);
					}catch(e) {
						console.log(e);
					}
					//Make sure IDs are valid and unique as they're used as keys on the server
					if(!ID_REGEX.test(c.id) || ids.has(c.id)) {
						c.id = Utils.uuid();
						dirty.push(c.id);
					}
					ids.add(c.id);
				}
			}

			this.calendars = calendars;
			this.dirty = dirty.filter(id => calendars.find(c => c.id == id));
			if(migrate) this.saveLocal();
		},

		saveLocal() {
			try {
				localStorage.setItem(LS_CALENDARS, JSON.stringify(this.calendars));
				localStorage.setItem(LS_DIRTY, JSON.stringify(this.dirty));
			}catch(e) {
				console.warn("Unable to save calendars locally", e);
			}
		},
	}
})
