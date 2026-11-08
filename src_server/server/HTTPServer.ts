import * as http from "http";
import Config from '../utils/Config';
import Logger from '../utils/Logger';
import historyApiFallback from 'connect-history-api-fallback';
import express, { Express, NextFunction, Request, Response } from "express";
import CalendarController from '../api/CalendarController';
import type CalendarStorage from '../storage/CalendarStorage';

export default class HTTPServer {
	
	protected app : Express = express();

	constructor (public port : number, private storage : CalendarStorage) {
		this.doPrepareApp();
	}

	protected initError(error: any): void {
		Logger.error("Error happened !", error);
	}

	protected doPrepareApp(): void {
		this.app.disable("x-powered-by");
		this.app.set("trust proxy", Config.TRUST_PROXY);

		this.app.use(historyApiFallback({
			index:'/'+Config.SERVER_NAME+"/index.html",
			//@ts-ignore
			publicPath: Config.PUBLIC_PATH,
			// verbose:true,
			rewrites: [
				{
					//Avoiding rewrites for API calls and socket
					from: /.*\/(api|sock)\/?.*$/,
					to: function(context) {
						return context.parsedUrl.pathname;
					}
				}
			],
		}));

		//API. Registered before the permissive CORS header below so that other
		//websites can't use it from their visitors' browsers.
		//Body parsing (with a strict size limit) is done by the API router itself.
		this.app.use(Config.SERVER_NAME+"/api", new CalendarController(this.storage).router);

		let staticHandler:any = express.static(Config.PUBLIC_PATH);
		this.app.use(Config.SERVER_NAME+"/", staticHandler);//static files

		this.app.all(Config.SERVER_NAME+"/{*splat}",  (req:Request, res:Response, next:NextFunction) => {
			//Static assets
			res.header("Access-Control-Allow-Origin", "*");
			next();
		});

		let server = new http.Server(<any>this.app);
		server.listen(this.port, () => this.listenHandler());

	}

	protected listenHandler(): void {
		Logger.success("Server ready on port " + Config.SERVER_PORT + " :: server name \"" + Config.SERVER_NAME + "\"");
	}

	protected errorHandler (error : any, req : Request, res : Response, next : NextFunction) {
		Logger.error("Express error");
		console.log(error);
		
		let status = error.status || 500;
		let err = error.error || error;
		res.status(status);
		if (typeof err == "object")
			res.json(err);
		else {
			res.send(err);
		}
	}
}