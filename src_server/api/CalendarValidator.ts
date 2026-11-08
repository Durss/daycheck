/**
 * Validates calendars sent by clients and rebuilds a clean object from them
 * so that only expected fields, with sane values, get stored.
 */
export default class CalendarValidator {

	public static readonly DATA_VERSION = 3;
	public static readonly MAX_NAME_LENGTH = 100;
	public static readonly MAX_DESCRIPTION_LENGTH = 2000;
	public static readonly MAX_DAYS = 3650;
	public static readonly MAX_HISTORY = 500;
	public static readonly MAX_CHECKS = 4000;
	public static readonly MAX_CHECK_VALUE = 5;
	private static readonly MIN_DATE = "2000-01-01";
	private static readonly DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

	/**
	 * Returns the sanitized calendar, or throws an Error describing the problem.
	 */
	public static validate(id:string, body:any):CalendarRecord {
		const fail = (message:string):never => { throw new ValidationError(message); };

		if(!body || typeof body != "object" || Array.isArray(body)) fail("Calendar must be an object");
		if(body.v !== this.DATA_VERSION) fail("Unsupported data version");
		if(body.id !== undefined && body.id !== id) fail("ID mismatch");

		//Clients can be slightly ahead because of timezones, or start a run the next day
		const maxDate = this.addDays(new Date().toISOString().substring(0, 10), 2);
		const isDate = (value:any):boolean => this.isValidDate(value) && value >= this.MIN_DATE && value <= maxDate;
		const isDays = (value:any):boolean => Number.isInteger(value) && value >= 1 && value <= this.MAX_DAYS;

		if(typeof body.name != "string") fail("Invalid name");
		if(body.name.length > this.MAX_NAME_LENGTH) fail("Name is too long");

		const description = body.description ?? "";
		if(typeof description != "string") fail("Invalid description");
		if(description.length > this.MAX_DESCRIPTION_LENGTH) fail("Description is too long");

		if(body.days !== null && !isDays(body.days)) fail("Invalid number of days");
		if(!isDate(body.start)) fail("Invalid start date");

		const history = body.history ?? [];
		if(!Array.isArray(history)) fail("Invalid history");
		if(history.length > this.MAX_HISTORY) fail("History is too long");
		const cleanHistory = history.map((run:any) => {
			if(!run || typeof run != "object" || !isDate(run.start) || !isDays(run.days)) fail("Invalid history entry");
			return {start:run.start as string, days:run.days as number};
		});

		const checks = body.checks ?? {};
		if(typeof checks != "object" || Array.isArray(checks)) fail("Invalid checks");
		const keys = Object.keys(checks);
		if(keys.length > this.MAX_CHECKS) fail("Too many checks");
		const cleanChecks:{[date:string]:number} = {};
		for (const key of keys) {
			const value = checks[key];
			if(!isDate(key)) fail("Invalid check date");
			if(!Number.isInteger(value) || value < 0 || value > this.MAX_CHECK_VALUE) fail("Invalid check value");
			if(value > 0) cleanChecks[key] = value;
		}

		return {
			v: this.DATA_VERSION,
			id,
			name: body.name,
			description,
			days: body.days,
			start: body.start,
			checks: cleanChecks,
			history: cleanHistory,
			updatedAt: new Date().toISOString(),
		};
	}

	/**
	 * Checks that a value is an existing "YYYY-MM-DD" date
	 */
	private static isValidDate(value:any):boolean {
		if(typeof value != "string") return false;
		const match = value.match(this.DATE_REGEX);
		if(!match) return false;
		const [y, m, d] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
		const date = new Date(Date.UTC(y, m - 1, d));
		return date.getUTCFullYear() == y && date.getUTCMonth() == m - 1 && date.getUTCDate() == d;
	}

	private static addDays(date:string, days:number):string {
		const d = new Date(date+"T00:00:00Z");
		d.setUTCDate(d.getUTCDate() + days);
		return d.toISOString().substring(0, 10);
	}
}

export class ValidationError extends Error {}

export interface CalendarRecord {
	v:number;
	id:string;
	name:string;
	description:string;
	days:number|null;
	start:string;
	checks:{[date:string]:number};
	history:{start:string, days:number}[];
	updatedAt:string;
}
