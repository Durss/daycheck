import HTTPServer from "./server/HTTPServer";
import CalendarStorage from "./storage/CalendarStorage";
import Config from "./utils/Config";
import Logger from "./utils/Logger";

async function main():Promise<void> {
	const storage = new CalendarStorage(Config.DATA_PATH, Config.MAX_CALENDARS, Config.MAX_STORAGE_MB * 1024 * 1024);
	await storage.init();
	new HTTPServer(Config.SERVER_PORT, storage);
	schedulePurge(storage);
}

/**
 * Deletes calendars that haven't been modified for a long time, at startup then once a day
 */
function schedulePurge(storage:CalendarStorage):void {
	const days = Config.PURGE_AFTER_DAYS;
	if(days == 0) {
		Logger.info("Purge of abandoned calendars disabled");
		return;
	}
	const purge = async () => {
		try {
			const count = await storage.purge(days * 24 * 60 * 60 * 1000);
			if(count > 0) Logger.info(count+" calendar(s) unchanged for "+days+" days deleted");
		}catch(error) {
			Logger.error("Purge of abandoned calendars failed", error);
		}
	};
	purge();
	setInterval(purge, Config.PURGE_INTERVAL_MS);
}

main().catch(error => {
	Logger.error("Unable to start server", error);
	process.exit(1);
});
