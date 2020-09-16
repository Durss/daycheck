<template>
	<div class="calendar frame" v-if="data">
		<div class="head">
			<Button :icon="require('@/assets/icons/back.svg')" class="back" @click="clickBack()" />
			<div class="title">
				<h1 contenteditable="true" @keydown="onFilterLineBreaks" @blur="updateTitle" ref="title" v-text="data.name"></h1>
				<i>(<img src="@/assets/icons/checkmark.svg">{{countDone}}/{{data.days}})</i>
			</div>
			<Button :icon="require('@/assets/icons/qrcode.svg')" class="qrcode" @click="showQRCode = !showQRCode" />
		</div>

		<QRCodeOverlay v-if="showQRCode" class="qrcodeOverlay" />

		<div class="content" v-if="!showQRCode">

			<Button :icon="require('@/assets/icons/prev.svg')" v-if="showPrev" @click="onPrevHistory" class="prev" />
			<Button :icon="require('@/assets/icons/next.svg')" v-if="showNext" @click="onNextHistory" class="next" />
			<Button :icon="require('@/assets/icons/show.svg')" title="Description" @click="showDescription = !showDescription" class="toggleDescription" />

			<pre v-if="data.description != null && showDescription"
				class="description"
				contenteditable="true"
				@blur="updateDescription"
				ref="description" v-text="this.data.description"></pre>

			<div v-if="historyIndex > 0">{{currHistoryDate}}</div>

			<div class="list">
				<Checkable
					:index="index"
					:data="daysDone"
					:startDate="startDate"
					@click="onIncrement"
					ref="items"
					class="item" v-for="(v, index) in data.days"
					:key="index"
				/>
			</div>

			<div v-if="complete">
				<Button title="Start again" class="restart" @click="restart" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import Utils from '../utils/Utils';
import Button from '../components/Button.vue';
import Checkable from '../components/Checkable.vue';
import gsap from 'gsap';
import QRCodeOverlay from './QRCodeOverlay.vue';
import CalendarData from '../vo/CalendarData';

@Component({
	components:{
		Button,
		Checkable,
		QRCodeOverlay,
	}
})
export default class Calendar extends Vue {

	@Prop()
	public id:any;

	public historyIndex:number = 0;
	public data:CalendarData = null;
	public showQRCode:boolean = false;
	public showDescription:boolean = false;

	public get currHistoryDate() {
		if(!this.currHistory) return null;
		let start = Utils.formatDate(this.currHistory.start);
		let endDate = new Date(this.currHistory.start);
		endDate.setDate(endDate.getDate() + this.currHistory.daysDone.length);
		let end = Utils.formatDate(endDate.toISOString());

		return start+" -> "+end;
	}

	public get currHistory() {
		if(this.historyIndex > 0) {
			return this.data.history[this.data.history.length - this.historyIndex];
		}else{
			return null;
		}
	}

	public get countDone():number {
		if(!this.data.daysDone) return 0;
		let count = 0;
		for (let i = 0; i < this.data.daysDone.length; i++) {
			const element = this.data.daysDone[i];
			if(element > 0) count ++;
		}
		return count;
	}

	public get showPrev():boolean {
		return this.data.history && this.data.history.length > 0 && this.historyIndex < this.data.history.length;
	}

	public get showNext():boolean {
		return this.historyIndex > 0;
	}

	public get daysDone():number[] {
		if(this.currHistory) {
			return this.currHistory.daysDone;
		}else{
			return this.data.daysDone;
		}
	}

	public get startDate():string {
		if(this.currHistory) {
			return this.currHistory.start;
		}else{
			return this.data.start;
		}
	}

	public get complete():boolean {
		let ref = new Date();
		let d = new Date(this.data.start);
		d.setHours(0);
		d.setMinutes(0);
		d.setSeconds(0);
		const oneDay = 24 * 60 * 60 * 1000;
		const diffDays = Math.ceil(Math.abs((ref.getTime() - d.getTime()) / oneDay));
		return diffDays >= this.data.days;
	}
	
	public mounted():void {
		this.populate();
	}

	public beforeDestroy():void {
		
	}

	@Watch("id")
	public populate():void {
		let list = this.$store.state.calendars;
		for (let i = 0; i < list.length; i++) {
			const l = list[i];
			if(l.id == this.id) {
				this.data = l;
				this.$store.dispatch("setData", l);
			}
		}

		this.$nextTick().then(_=> {
			let elements:Vue[] = <Vue[]>this.$refs.items;
			for (let i = 0; i < elements.length; i++) {
				const item = elements[i];
				gsap.set(item.$el, {scaleX:0, scaleY:0, opacity:0})
				gsap.to(item.$el, {duration:1, scaleX:1, delay:.03*i + .5, ease:"elastic.out(1, .5)"})
				gsap.to(item.$el, {duration:1, scaleY:1, delay:.03*i + .55, ease:"elastic.out(1, .5)"})
				gsap.to(item.$el, {duration:.5, opacity:1, delay: .5})
			}
		})
	}
	
	public onIncrement(index:number):void {
		this.$store.dispatch("checkDate", {index});
		this.data = this.$store.state.data;
	}

	public clickBack():void {
		if(this.showQRCode) {
			this.showQRCode = false;
		}else{
			this.$router.push({name:'home'});
		}
	}

	public updateTitle():void {
		let t = (<HTMLDivElement>this.$refs.title).innerText;
		this.data.name = t;
		this.$store.dispatch("setData", this.data);
	}

	public updateDescription():void {
		let t = (<HTMLDivElement>this.$refs.description).innerText;
		this.data.description = t;
		this.$store.dispatch("setData", this.data);
	}

	public onFilterLineBreaks(event:KeyboardEvent):void {
		if(event.which == 13) {
			event.preventDefault();
		}
	}

	public async restart():Promise<void> {
		try {
			await Utils.confirm("Reset calendar ?", null, "Current calendar will be saved and reset. You'll be able to navigate to your previous calendar(s) to compare your performances.")
		}catch(error) {
			//Refused
			return
		}
		let h = {
			daysDone:JSON.parse(JSON.stringify(this.data.daysDone)),
			start:this.data.start,
		}
		//Save prev state
		if(!this.data.history) {
			Vue.set(this.data, "history", []);
		}
		this.data.history.push(h);

		//Reset current state
		for (let i = 0; i < this.data.daysDone.length; i++) {
			this.data.daysDone[i] = 0;
		}
		let d = new Date();
		d.setHours(0);
		d.setMinutes(0);
		this.data.start = d.toISOString();
		Vue.set(this.data, "daysDone", []);
		this.$store.dispatch("setData", this.data);
	}

	public onPrevHistory():void {
		this.historyIndex ++;
	}

	public onNextHistory():void {
		this.historyIndex --;
	}

}
</script>

<style scoped lang="less">
.calendar{
	width: 90vw;
	max-width: 640px;
	min-width: 280px;

	.head {
		padding-left: 50px;
		padding-right: 50px;
		i {
			white-space: nowrap;
			img {
				height: 15px;
				margin-left: 4px;
				vertical-align: bottom;
			}
		}
	}

	.toggleDescription {
		margin: auto;
		margin-bottom: 20px;
		display: block;
		::v-deep .icon {
			vertical-align: bottom;
		}
	}

	.qrcode, .back {
		position: absolute;
		top: 0px;
		right: 0px;
		padding: 10px;
		border-radius: 0;
		border-top-right-radius: 10px;
		height: 50px;
		width: 50px;
	}

	.back {
		right: auto;
		left: 0;
		border-top-left-radius: 10px;
		border-top-right-radius: 0px;
	}

	.qrcodeOverlay {
		width: 100%;
	}

	.content {
		width: 100%;
		position: relative;
		box-sizing: border-box;

		.description {
			margin-bottom: 20px;
			min-height: 20px;
			text-align: center;
			font-family: "FuturaLight";
			white-space: pre-wrap;
			padding: 5px;;
			background-color: @mainColor_light_light;
			border-radius: 10px;
		}

		.prev, .next {
			width: 40px;
			height: 40px;
			position: absolute;
			padding-left: 10px;
			padding-right: 12px;
			&.next {
				padding-right: 10px;
				padding-left: 12px;
				right: 20px;
			}
		}

		.list {
			width: 100%;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
		}

		.restart {
			margin: auto;
			margin-top: 20px;
			display: block;
		}
	}
}

@media only screen and (max-width: 500px) {
	.calendar{
		.content {
			.list {
				width: 100%;
				.item {
					width: 76px;
					height: 76px;
					padding: 2px;
				}
			}
		}
	}
}

@media only screen and (max-width: 320px) {
	.calendar{
		.content {
			.list {
				width: 100%;
				.item {
					width: 56px;
					height: 56px;
					padding: 2px;
				}
			}
		}
	}
}

</style>