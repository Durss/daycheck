import Config from './Config';
import DateUtils from './DateUtils';

export default class DataMigrator {


	constructor() {
		this.initialize();
	}



	/********************
	 * GETTER / SETTERS *
	 ********************/



	/******************
	 * PUBLIC METHODS *
	 ******************/
	/**
	 * Migrates data to the current version.
	 * Returns true if data has been modified.
	 */
	public migrate(data:any):boolean {
		if(data.v == Config.DATA_VERSION) return false;

		//Calendars created before versioning was added to creation had no "v" field
		//but were in V2 format.
		if(data.v == undefined) data.v = 2;

		if(data.v == 1) {
			this.applyV1updates(data);
			data.v = 2;
		}
		if(data.v == 2) {
			this.applyV2updates(data);
			data.v = 3;
		}

		data.v = Config.DATA_VERSION;
		return true;
	}



	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Initializes the class
	 */
	private initialize():void {

	}

	private applyV1updates(data:any):void {
		let offset = 0;
		if(data.daysDone) {
			for (let i = 0; i < data.daysDone.length; i++) {
				data.daysDone[i] = data.daysDone[i]? 1 : 0;
				if(data.daysDone[i] > 0) offset ++;
			}
		}
		let start = new Date();
		start.setDate(start.getDate() - offset);
		data.start = start.toISOString();
	}

	/**
	 * V2 stored checks as an array indexed by the number of days since
	 * the "start" ISO date, and history as a list of {start, daysDone}.
	 * V3 stores checks by actual local day and history as a list of runs.
	 */
	private applyV2updates(data:any):void {
		const checks:{[date:string]:number} = {};

		const convertRun = (start:string, daysDone:number[]):string => {
			let startDate = new Date(start);
			if(!DateUtils.isValid(startDate)) startDate = new Date();
			const startKey = DateUtils.toKey(startDate);
			(daysDone || []).forEach((v, i) => {
				if(!(v > 0)) return;
				const key = DateUtils.addDays(startKey, i);
				checks[key] = Math.max(checks[key] || 0, v);
			});
			return startKey;
		}

		const days = parseInt(data.days) || 1;
		data.history = (data.history || []).map((h:any) => ({
			start: convertRun(h.start, h.daysDone),
			days,
		}));
		data.start = convertRun(data.start, data.daysDone);
		data.days = days;
		data.checks = checks;
		delete data.daysDone;
	}
}
