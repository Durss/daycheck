import * as fs from "fs";
import { LogStyle } from "../utils/Logger";
/**
 * Created by Durss
 */
export default class Config {

	private static _ENV_NAME: EnvName;
	private static _CONF_PATH: string = "env.conf";

	public static get API_VERSION(): string {
		return this.getEnvData({
			dev: "v1",
			prod: "v1",
			standalone: "v1",
		});
	}
	

	public static get LOGS_ENABLED(): boolean {
		return this.getEnvData({
			dev: true,
			prod: false,
		});
	}

	public static get SERVER_PORT(): number {
		return this.getEnvData({
			dev: 3003,
			prod: 3003,
		});
	}
	
	public static get PUBLIC_PATH(): string {
		return this.getEnvData({
			dev: "./dist",
			prod: "./public",
		});
	}

	public static get SERVER_NAME(): string {
		return this.getEnvData({
			dev: "",
			prod: "",
		});
	}

	public static get CONTROLLERS_PATH(): string {
		return this.getEnvData({
			dev: "./server/controllers",
			prod: "./controllers",
		});
	}

	/**
	 * Folder where calendars are stored as JSON files.
	 * Mount it as a volume when running with docker.
	 */
	public static get DATA_PATH(): string {
		return process.env.DATA_PATH || "./data";
	}

	/**
	 * Maximum number of calendars stored on the server.
	 * Creating new calendars is refused once reached.
	 */
	public static get MAX_CALENDARS(): number {
		return this.envInt("MAX_CALENDARS", 10000);
	}

	/**
	 * Maximum disk space used by calendars, in megabytes.
	 */
	public static get MAX_STORAGE_MB(): number {
		return this.envInt("MAX_STORAGE_MB", 200);
	}

	/**
	 * Calendars that haven't been modified for this number of days are deleted.
	 * 0 disables the purge.
	 */
	public static get PURGE_AFTER_DAYS(): number {
		const value = parseInt(process.env.PURGE_AFTER_DAYS);
		return isNaN(value) || value < 0? 365 : value;
	}

	/** Delay between two purges of abandoned calendars */
	public static readonly PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

	/**
	 * Express "trust proxy" setting, needed to get the real client IP
	 * (used for rate limiting) when running behind a reverse proxy.
	 * Set TRUST_PROXY=1 if exactly one proxy (nginx, traefik, caddy...) sits in front of the app.
	 * Leave it unset if clients reach the app directly, otherwise they can spoof their IP.
	 * @see https://expressjs.com/en/guide/behind-proxies.html
	 */
	public static get TRUST_PROXY(): boolean|number|string {
		const value = (process.env.TRUST_PROXY || "").trim();
		if(value == "" || value == "false") return false;
		if(value == "true") return true;
		if(/^\d+$/.test(value)) return parseInt(value);
		return value;
	}

	/** Maximum size of a calendar sent to the API */
	public static readonly MAX_BODY_SIZE = "64kb";

	/** Rate limits, per client IP */
	public static readonly RATE_LIMITS = {
		read:	{max:300, windowMs: 60 * 1000},
		write:	{max:120, windowMs: 60 * 1000},
		create:	{max:30, windowMs: 60 * 60 * 1000},
	};

	private static envInt(name:string, fallback:number):number {
		const value = parseInt(process.env[name]);
		return isNaN(value) || value <= 0? fallback : value;
	}

	/**
	 * Extract a data from an hasmap depending on the current environment.
	 * @param map
	 * @returns {any}
	 */
	private static getEnvData(map: any): any {
		//Grab env name the first time
		if (!this._ENV_NAME) {
			if (fs.existsSync(this._CONF_PATH)) {
				let content: string = fs.readFileSync(this._CONF_PATH, "utf8");
				this._ENV_NAME = <EnvName>content;
				let str: String = "  :: Current environment \"" + content + "\" ::  ";
				let head: string = str.replace(/./g, " ");
				console.log("\n");
				console.log(LogStyle.BgGreen + head + LogStyle.Reset);
				console.log(LogStyle.Bright + LogStyle.BgGreen + LogStyle.FgWhite + str + LogStyle.Reset);
				console.log(LogStyle.BgGreen + head + LogStyle.Reset);
				console.log("\n");
				
			} else {
				this._ENV_NAME = "dev";
				fs.writeFileSync(this._CONF_PATH, this._ENV_NAME);
				let str: String = "  /!\\ Missing file \"./" + this._CONF_PATH + "\" /!\\  ";
				let head: string = str.replace(/./g, " ");
				console.log("\n");
				console.log(LogStyle.BgRed + head + LogStyle.Reset);
				console.log(LogStyle.Bright + LogStyle.BgRed + LogStyle.FgWhite + str + LogStyle.Reset);
				console.log(LogStyle.BgRed + head + LogStyle.Reset);
				console.log("\n");
				console.log("Creating env.conf file autmatically and set it to \"standalone\"\n\n");
			}
		}

		//Get the data from hashmap
		if (map[this._ENV_NAME]) return map[this._ENV_NAME];
		return map[Object.keys(map)[0]];
	}
}

type EnvName = "dev" | "preprod" | "prod";