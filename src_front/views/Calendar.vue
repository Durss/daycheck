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

			<Button :icon="require('@/assets/icons/show.svg')" title="Description" @click="showDescription = !showDescription" class="toggleDescription" />
			<pre v-if="data.description != null && showDescription"
				class="description"
				contenteditable="true"
				@blur="updateDescription"
				ref="description" v-text="this.data.description"></pre>

			<div class="list">
				<Checkable
					:index="index"
					:data="data"
					@change="onCheckChange"
					ref="items"
					class="item" v-for="(v, index) in data.days"
					:key="index"
				/>
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

	public get countDone():number {
		if(!this.data.daysDone) return 0;
		let count = 0;
		for (let i = 0; i < this.data.daysDone.length; i++) {
			const element = this.data.daysDone[i];
			if(element > 0) count ++;
		}
		return count;
	}

	public get daysDone():number[] {
		if(this.historyIndex != 0) {
			return this.data.history[this.historyIndex].daysDone;
		}else{
			return this.data.daysDone;
		}
	}

	public get complete():boolean {
		let ref = new Date();
		let d = new Date(this.data.start);
		d.setHours(0)
		d.setSeconds(0)
		const oneDay = 24 * 60 * 60 * 1000;
		const diffDays = Math.round(Math.abs((ref.getTime() - d.getTime()) / oneDay));
		return diffDays > this.data.days;
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
	
	public onCheckChange(index:number, value:boolean):void {
		this.$store.dispatch("checkDate", {index, value});
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


}
</script>

<style scoped lang="less">
@import (reference) '../less/_includes.less';
.calendar{
	width: 640px;

	.head {
		padding-left: 50px;
		padding-right: 50px;
		i {
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

		.list {
			width: 100%;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
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
		width: 360px;

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
		width: 280px;

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