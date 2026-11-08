import Logger from "./Logger";

/**
 * Simple in-memory fixed window rate limiter.
 */
export default class RateLimiter {

	/** Safety net so that a flood of distinct IPs can't grow memory indefinitely */
	private static readonly MAX_ENTRIES = 50000;

	private hits = new Map<string, {count:number, reset:number}>();

	constructor(private name:string, private max:number, private windowMs:number) {
		setInterval(() => this.cleanup(), windowMs).unref();
	}

	/**
	 * Registers a hit for the given IP.
	 * Returns 0 if allowed, or the number of seconds to wait otherwise.
	 */
	public consume(ip:string):number {
		const key = RateLimiter.ipKey(ip);
		const now = Date.now();
		let entry = this.hits.get(key);
		if(!entry || entry.reset <= now) {
			if(this.hits.size >= RateLimiter.MAX_ENTRIES) this.cleanup();
			if(this.hits.size >= RateLimiter.MAX_ENTRIES) this.hits.clear();
			entry = {count:0, reset:now + this.windowMs};
			this.hits.set(key, entry);
		}
		entry.count ++;
		if(entry.count <= this.max) return 0;
		//Log only once per window to avoid flooding the logs
		if(entry.count == this.max + 1) {
			Logger.warn("Rate limit \""+this.name+"\" reached by "+key);
		}
		return Math.ceil((entry.reset - now) / 1000);
	}

	private cleanup():void {
		const now = Date.now();
		for (const [key, entry] of this.hits) {
			if(entry.reset <= now) this.hits.delete(key);
		}
	}

	/**
	 * Normalizes an IP. IPv6 addresses are reduced to their /64 prefix
	 * as a single client usually owns a whole /64 block.
	 */
	private static ipKey(ip:string):string {
		if(!ip) return "unknown";
		ip = ip.split("%")[0];//Remove IPv6 zone index
		const v4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
		if(v4) return v4[1];
		if(!ip.includes(":")) return ip;

		const [head, tail] = ip.split("::");
		const headParts = head? head.split(":") : [];
		const tailParts = tail? tail.split(":") : [];
		const fill = tail !== undefined? Array(Math.max(0, 8 - headParts.length - tailParts.length)).fill("0") : [];
		const parts = [...headParts, ...fill, ...tailParts];
		return parts.slice(0, 4).map(p => (parseInt(p, 16) || 0).toString(16)).join(":")+"::/64";
	}
}
