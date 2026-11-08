/**
 * Helpers to manipulate local calendar days as "YYYY-MM-DD" keys.
 * Keys are timezone agnostic and can be compared as strings.
 */
export default class DateUtils {

	public static readonly WEEK_DAYS:string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

	/**
	 * Converts a date to a local "YYYY-MM-DD" key
	 */
	public static toKey(date:Date):string {
		const pad = (n:number) => n.toString().padStart(2, "0");
		return date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate());
	}

	/**
	 * Converts a "YYYY-MM-DD" key to a local date at midnight
	 */
	public static fromKey(key:string):Date {
		const [y, m, d] = key.split("-").map(v => parseInt(v));
		return new Date(y, m-1, d);
	}

	public static todayKey():string {
		return this.toKey(new Date());
	}

	public static addDays(key:string, days:number):string {
		const d = this.fromKey(key);
		d.setDate(d.getDate() + days);
		return this.toKey(d);
	}

	/**
	 * Number of days from key "from" to key "to" (negative if "to" is before "from")
	 */
	public static diffDays(from:string, to:string):number {
		const [y1, m1, d1] = from.split("-").map(v => parseInt(v));
		const [y2, m2, d2] = to.split("-").map(v => parseInt(v));
		//Using UTC avoids DST shifts
		return Math.round((Date.UTC(y2, m2-1, d2) - Date.UTC(y1, m1-1, d1)) / (24 * 60 * 60 * 1000));
	}

	/**
	 * Formats a "YYYY-MM-DD" key as "DD/MM/YYYY"
	 */
	public static format(key:string):string {
		const [y, m, d] = key.split("-");
		return d+"/"+m+"/"+y;
	}

	public static isValid(date:Date):boolean {
		return date instanceof Date && !isNaN(date.getTime());
	}
}
