import Config from './Config';

export default class DataMigrator {
	
	
	constructor() {
		this.initialize();
	}
	
	
	
	/********************
	 * GETTER / SETTERS *
	 ********************/
	
	
	
	/******************
	 * PUBLIC METHODS *
	 ******************/
	public migrate(data:any):void {
		if(data.v == 1) this.applyV1updates(data);

		data.v = Config.DATA_VERSION;
	}
	
	
	
	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Initializes the class
	 */
	private initialize():void {
		
	}

	public applyV1updates(data:any):void {
		let offset = 0;
		if(data.daysDone) {
			for (let i = 0; i < data.daysDone.length; i++) {
				data.daysDone[i] = data.daysDone[i]? 1 : 0;
				if(data.daysDone[i] > 0) offset ++;
			}
		}
		data.start = new Date();
		(<Date>data.start).setDate(data.start.getDate() - offset);
	}
}