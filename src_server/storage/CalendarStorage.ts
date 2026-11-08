import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import Logger from "../utils/Logger";

export type WriteResult = "ok" | "full";

interface Entry {
	/** File size in bytes */
	size:number;
	/** Last modification time (ms timestamp) */
	mtime:number;
}

/**
 * Stores calendars as one JSON file per calendar.
 * Keeps track of the number of files and total size to enforce storage quotas,
 * and of their last modification time to purge abandoned calendars.
 */
export default class CalendarStorage {

	/** Calendar IDs are lowercase v4 UUIDs */
	public static readonly ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
	private static readonly FILE_REGEX = /^([0-9a-f-]{36})\.json$/;

	private entries = new Map<string, Entry>();
	private totalBytes = 0;
	/** Pending operations by calendar ID, so writes on a same file are applied in order */
	private queues = new Map<string, Promise<unknown>>();

	constructor(private dir:string, private maxCount:number, private maxBytes:number) {}

	/**
	 * Creates the storage folder if necessary and indexes existing files
	 */
	public async init():Promise<void> {
		await fs.promises.mkdir(this.dir, {recursive:true});
		await this.checkWritable();
		const files = await fs.promises.readdir(this.dir);
		for (const file of files) {
			const match = file.match(CalendarStorage.FILE_REGEX);
			if(match && CalendarStorage.isValidId(match[1])) {
				const stat = await fs.promises.stat(this.filePath(match[1]));
				this.entries.set(match[1], {size:stat.size, mtime:stat.mtimeMs});
				this.totalBytes += stat.size;
			}else if(file.endsWith(".tmp")) {
				//Leftover of an interrupted write
				await fs.promises.unlink(path.join(this.dir, file)).catch(() => {});
			}
		}
		Logger.info(this.entries.size+" calendar(s) found in \""+path.resolve(this.dir)+"\" ("+(this.totalBytes/1024).toFixed(1)+" KB)");
	}

	/**
	 * Makes sure calendars can be written, to fail at startup with a clear
	 * message rather than on every save (typically a docker bind mount owned by root)
	 */
	private async checkWritable():Promise<void> {
		const probe = path.join(this.dir, ".write-test-"+crypto.randomBytes(6).toString("hex")+".tmp");
		try {
			await fs.promises.writeFile(probe, "");
			await fs.promises.unlink(probe);
		}catch(error:any) {
			const uid = typeof process.getuid == "function"? process.getuid() : "?";
			const gid = typeof process.getgid == "function"? process.getgid() : "?";
			throw new Error("Calendars folder \""+path.resolve(this.dir)+"\" isn't writable by the server (uid "+uid+")."
				+" If it's a docker bind mount, give it to that user on the host, eg: sudo chown -R "+uid+":"+gid+" calendars (from the folder containing docker-compose.yml)"
				+" ("+error.code+")");
		}
	}

		public static isValidId(id:string):boolean {
		return typeof id == "string" && CalendarStorage.ID_REGEX.test(id);
	}

	public has(id:string):boolean {
		return this.entries.has(id);
	}

	public async read(id:string):Promise<any|null> {
		if(!this.has(id)) return null;
		try {
			return JSON.parse(await fs.promises.readFile(this.filePath(id), "utf8"));
		}catch(error) {
			Logger.error("Unable to read calendar "+id, error);
			return null;
		}
	}

	/**
	 * Writes a calendar.
	 * Returns "full" without writing anything if storage quotas would be exceeded.
	 */
	public write(id:string, data:any):Promise<WriteResult> {
		const content = JSON.stringify(data);
		const size = Buffer.byteLength(content);
		const prev = this.entries.get(id);
		const prevSize = prev? prev.size : 0;

		//Quotas are checked and space reserved synchronously so concurrent
		//requests can't exceed them
		if(!prev && this.entries.size >= this.maxCount) return Promise.resolve("full");
		if(this.totalBytes - prevSize + size > this.maxBytes) return Promise.resolve("full");
		const entry:Entry = {size, mtime:Date.now()};
		this.entries.set(id, entry);
		this.totalBytes += size - prevSize;

		return this.enqueue(id, async () => {
			const file = this.filePath(id);
			const tmp = file+"."+crypto.randomBytes(6).toString("hex")+".tmp";
			try {
				await fs.promises.writeFile(tmp, content, "utf8");
				await fs.promises.rename(tmp, file);
			}catch(error) {
				await fs.promises.unlink(tmp).catch(() => {});
				//Rollback reservation if no other operation happened in the meantime
				if(this.entries.get(id) === entry) {
					if(prev) this.entries.set(id, prev);
					else this.entries.delete(id);
					this.totalBytes -= size - prevSize;
				}
				throw error;
			}
			return "ok" as WriteResult;
		});
	}

	public delete(id:string):Promise<void> {
		const entry = this.entries.get(id);
		if(!entry) return Promise.resolve();
		this.entries.delete(id);
		this.totalBytes -= entry.size;
		return this.enqueue(id, async () => {
			await fs.promises.unlink(this.filePath(id)).catch(error => {
				if(error.code != "ENOENT") throw error;
			});
		});
	}

	/**
	 * Deletes calendars that haven't been modified for the given duration.
	 * Returns the number of deleted calendars.
	 */
	public async purge(maxAgeMs:number):Promise<number> {
		const limit = Date.now() - maxAgeMs;
		let count = 0;
		for (const [id, entry] of [...this.entries]) {
			if(entry.mtime >= limit) continue;
			try {
				//Double check on disk in case the file was modified outside of the server
				const stat = await fs.promises.stat(this.filePath(id));
				const current = this.entries.get(id);
				//Skip if written or deleted in the meantime
				if(current !== entry) continue;
				if(stat.mtimeMs >= limit) {
					entry.mtime = stat.mtimeMs;
					continue;
				}
				await this.delete(id);
				count ++;
			}catch(error:any) {
				if(error.code == "ENOENT") {
					//File removed outside of the server
					if(this.entries.get(id) === entry) {
						this.entries.delete(id);
						this.totalBytes -= entry.size;
					}
				}else{
					Logger.error("Unable to purge calendar "+id, error);
				}
			}
		}
		return count;
	}

	private filePath(id:string):string {
		return path.join(this.dir, id+".json");
	}

	private enqueue<T>(id:string, task:() => Promise<T>):Promise<T> {
		const prev = this.queues.get(id) || Promise.resolve();
		const next = prev.then(task, task);
		const settled = next.catch(() => {});
		this.queues.set(id, settled);
		settled.then(() => {
			if(this.queues.get(id) === settled) this.queues.delete(id);
		});
		return next;
	}
}
