export interface CalendarRun {
	/** First day of the run ("YYYY-MM-DD", local) */
	start:string;
	/** Duration of the run in days */
	days:number;
}

export default interface CalendarData {
	id:string;
	name:string;
	description:string;
	/** Duration of the current run in days, null for an endless challenge */
	days:number|null;
	/** First day of the current run ("YYYY-MM-DD", local) */
	start:string;
	/** Check level (1 to 5) by local day ("YYYY-MM-DD"). Unchecked days are absent. */
	checks:{[date:string]:number};
	/** Previous runs, oldest first */
	history:CalendarRun[];
	v:number;
	/** Last time the calendar was saved on the server (set by the server) */
	updatedAt?:string;
}

/** Limits enforced by the server */
export const CALENDAR_LIMITS = {
	name: 100,
	description: 2000,
};
