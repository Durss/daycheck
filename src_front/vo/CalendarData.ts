export default interface CalendarData {
	id:string;
	days:number;
	daysDone:number[];
	description:string;
	name:string;
	start:string;
	v:number;
	history:{
		start:string,
		daysDone:number[],
	}[];
}