import express, { NextFunction, Request, RequestHandler, Response, Router } from "express";
import Config from "../utils/Config";
import Logger from "../utils/Logger";
import RateLimiter from "../utils/RateLimiter";
import CalendarStorage from "../storage/CalendarStorage";
import CalendarValidator, { ValidationError } from "./CalendarValidator";

/**
 * REST API to read/write calendars:
 *   GET    /calendars/:id
 *   PUT    /calendars/:id	(creates or replaces)
 *   DELETE /calendars/:id
 *
 * There is no listing endpoint: knowing a calendar's ID (random UUID) is what grants access to it.
 */
export default class CalendarController {

	private readLimiter = new RateLimiter("read", Config.RATE_LIMITS.read.max, Config.RATE_LIMITS.read.windowMs);
	private writeLimiter = new RateLimiter("write", Config.RATE_LIMITS.write.max, Config.RATE_LIMITS.write.windowMs);
	private createLimiter = new RateLimiter("create", Config.RATE_LIMITS.create.max, Config.RATE_LIMITS.create.windowMs);
	private proxyWarningDone = false;
	private lastQuotaWarning = 0;

	constructor(private storage:CalendarStorage) {}

	public get router():Router {
		const router = express.Router();
		const parseBody = express.json({limit:Config.MAX_BODY_SIZE, strict:true});

		router.use((req, res, next) => this.checkProxyConfig(req, next));
		router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

		router.get("/calendars/:id",
			this.checkId,
			this.limit(this.readLimiter),
			(req, res) => this.getCalendar(req, res));

		router.put("/calendars/:id",
			this.checkId,
			this.limit(this.writeLimiter),
			this.limit(this.createLimiter, req => !this.storage.has(req.params.id as string)),
			parseBody,
			(req, res) => this.putCalendar(req, res));

		router.delete("/calendars/:id",
			this.checkId,
			this.limit(this.writeLimiter),
			(req, res) => this.deleteCalendar(req, res));

		router.use((req, res) => { res.status(404).json({error:"Not found"}); });
		router.use((error:any, req:Request, res:Response, next:NextFunction) => this.errorHandler(error, req, res));
		return router;
	}

	private async getCalendar(req:Request, res:Response):Promise<void> {
		const data = await this.storage.read(req.params.id as string);
		if(!data) {
			res.status(404).json({error:"Calendar not found"});
			return;
		}
		res.json(data);
	}

	private async putCalendar(req:Request, res:Response):Promise<void> {
		const id = req.params.id as string;
		const data = CalendarValidator.validate(id, req.body);
		const result = await this.storage.write(id, data);
		if(result == "full") {
			//Log at most once a minute to avoid flooding the logs
			if(Date.now() - this.lastQuotaWarning > 60 * 1000) {
				this.lastQuotaWarning = Date.now();
				Logger.warn("Storage quota reached, new calendars are refused (MAX_CALENDARS="+Config.MAX_CALENDARS+", MAX_STORAGE_MB="+Config.MAX_STORAGE_MB+")");
			}
			res.status(507).json({error:"Server storage is full"});
			return;
		}
		res.json(data);
	}

	private async deleteCalendar(req:Request, res:Response):Promise<void> {
		await this.storage.delete(req.params.id as string);
		res.status(204).end();
	}

	private checkId:RequestHandler = (req, res, next) => {
		if(!CalendarStorage.isValidId(req.params.id as string)) {
			res.status(400).json({error:"Invalid calendar ID"});
			return;
		}
		next();
	}

	/**
	 * Creates a middleware applying the given rate limiter.
	 * @param condition	optional filter to apply the limiter only on some requests
	 */
	private limit(limiter:RateLimiter, condition?:(req:Request) => boolean):RequestHandler {
		return (req, res, next) => {
			if(condition && !condition(req)) return next();
			const wait = limiter.consume(req.ip);
			if(wait > 0) {
				res.set("Retry-After", wait.toString());
				res.status(429).json({error:"Too many requests"});
				return;
			}
			next();
		};
	}

	/**
	 * Warns once if requests seem to come through a reverse proxy that isn't trusted,
	 * as all clients would then share the proxy's IP for rate limiting.
	 */
	private checkProxyConfig(req:Request, next:NextFunction):void {
		if(!this.proxyWarningDone && req.headers["x-forwarded-for"] && !req.app.get("trust proxy")) {
			this.proxyWarningDone = true;
			Logger.warn("Requests contain an X-Forwarded-For header but TRUST_PROXY isn't set: all clients will share the same rate limits. Set TRUST_PROXY=1 if the app runs behind a reverse proxy.");
		}
		next();
	}

	private errorHandler(error:any, req:Request, res:Response):void {
		if(error instanceof ValidationError) {
			res.status(400).json({error:error.message});
		}else if(error?.type == "entity.too.large") {
			res.status(413).json({error:"Calendar is too big"});
		}else if(error?.type == "entity.parse.failed" || error?.status == 400) {
			res.status(400).json({error:"Invalid JSON"});
		}else{
			Logger.error("API error on "+req.method+" "+req.originalUrl, error);
			res.status(500).json({error:"Internal error"});
		}
	}
}
