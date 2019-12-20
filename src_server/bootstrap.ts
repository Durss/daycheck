import HTTPServer from "./server/HTTPServer";
import Config from "./utils/Config";

let server = new HTTPServer(Config.SERVER_PORT);
server.loadController(Config.CONTROLLERS_PATH + "/*.js").listen();