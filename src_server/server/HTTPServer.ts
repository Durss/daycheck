import * as bodyParser from "body-parser";
import * as express from "express";
import { NextFunction, Request, Response } from "express-serve-static-core";
import * as http from "http";
import Config from '../utils/Config';
import Logger from '../utils/Logger';
import { AbstractExpressServer } from "./AbstractExpressServer";
import * as historyApiFallback from 'connect-history-api-fallback';

export default class HTTPServer extends AbstractExpressServer {
	protected initError(error: any): void {
		Logger.error("Error happened !", error);
	}

	protected doPrepareApp(): void {
		let server = new http.Server(<any>this.app);
		server.listen(this.port);
		

		this.app.use(historyApiFallback({
			index:'/'+Config.SERVER_NAME+"/index.html",
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

		let publicFolder = Config.PUBLIC_PATH;
		this.app.use(Config.SERVER_NAME+"/", express.static(publicFolder));//static files

		this.app.use(<any>bodyParser.json({limit: '10mb'}));
		this.app.use(<any>bodyParser.urlencoded({ extended: true }));

		this.app.all(Config.SERVER_NAME+"/*",  (req:Request, res:Response, next:NextFunction) => {
			//Static assets
			res.header("Access-Control-Allow-Origin", "*");
			next();
		});

	}

	protected listenHandler(): void {
		Logger.success("Server ready on port " + Config.SERVER_PORT + " :: server name \"" + Config.SERVER_NAME + "\"");
	}


	protected errorHandler(error: any, req: Request, res: Response, next: NextFunction): any {
		Logger.error("Express error");
		console.log(error)
		return super.errorHandler(error, req, res, next);
	}
}