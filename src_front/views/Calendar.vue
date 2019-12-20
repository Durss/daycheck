<template>
	<div class="calendar frame" v-if="data">
		<div class="head">
			<h1>{{this.data.name}} <i>({{countDone}}/{{data.days}})</i> </h1>
		</div>
		<Button :icon="require('@/assets/icons/back.svg')" class="back" :to="{name:'home'}" />
		<Button :icon="require('@/assets/icons/qrcode.svg')" class="qrcode" @click="showQRCode = !showQRCode" />
		<QRCodeOverlay v-if="showQRCode" class="qrcodeOverlay" />
		<div class="content" v-if="!showQRCode">
			<pre v-if="data.description" class="description">{{this.data.description}}</pre>
			<div class="list">
				<Checkable
					:index="index"
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

@Component({
	components:{
		Button,
		Checkable,
		QRCodeOverlay,
	}
})
export default class Calendar extends Vue {

	@Prop()
	public dataurl:any;

	public data:any = null;
	public showQRCode:boolean = false;

	public get countDone():number {
		if(!this.data.daysDone) return 0;
		let count = 0;
		for (let i = 0; i < this.data.daysDone.length; i++) {
			const element = this.data.daysDone[i];
			if(element === true) count ++;
		}
		return count;
	}

	public mounted():void {
		this.data = this.$store.state.data;
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

	public beforeDestroy():void {
		
	}
	
	public onCheckChange(index:number, value:boolean):void {
		this.$store.dispatch("checkDate", {index, value});
		this.data = this.$store.state.data;
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
			margin-bottom: 15px;
			text-align: center;
			font-family: "FuturaLight";
			white-space: pre-wrap;
		}

		.list {
			width: 100%;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			.item {
				width: 94px;
				height: 94px;
				padding: 3px;
				background-color: #fff;
			}
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