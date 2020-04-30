<template>
	<div :class="classes" @click="onClick" :data-tooltip="tooltip">
		<div class="inner">
			<span v-if="value==0">{{index+1}}</span>
			<img src="@/assets/icons/checkmark.svg" alt="check" v-if="value>0" class="checkmark">
			<div class="steps" v-if="value>0">
				<img src="@/assets/icons/star.svg" alt="check" v-if="value>0" class="star">
				<img src="@/assets/icons/star.svg" alt="check" v-if="value>1" class="star">
				<img src="@/assets/icons/star.svg" alt="check" v-if="value>2" class="star">
				<img src="@/assets/icons/star.svg" alt="check" v-if="value>3" class="star">
				<img src="@/assets/icons/star.svg" alt="check" v-if="value>4" class="star">
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import CalendarData from '../vo/CalendarData';

@Component({
	components:{}
})
export default class Checkable extends Vue {

	@Prop()
	public data:number[];

	@Prop()
	public startDate:string;

	@Prop()
	public index:number;

	public timeoutRefresh:NodeJS.Timer = null;
	public today:Date = null;

	public get isToday():boolean {
		return this.date.getDate() == this.today.getDate()
		&& this.date.getMonth() == this.today.getMonth()
		&& this.date.getFullYear() == this.today.getFullYear();
	}

	public get isFuture():boolean {
		return !this.isToday;
		return this.date.getDate() > this.today.getDate()
		|| this.date.getMonth() > this.today.getMonth()
		|| this.date.getFullYear() > this.today.getFullYear();
	}

	public get tooltip():string {
		if(this.isToday) return "Today";
		return "";
	}

	public get classes():string[] {
		let res = ["checkable"];
		if(this.value>0) res.push("selected");
		if(this.isToday) res.push("today");
		if(this.isFuture) res.push("future");
		if(this.value>0) res.push("size"+this.value);
		return res;
	}

	public get value():number {
		let daysDone = this.data;
		return daysDone && daysDone[this.index]? daysDone[this.index] : 0;
	}

	public get date():Date {
		let d = new Date(this.startDate);
		d.setDate(d.getDate() + this.index);
		return d;
	}

	public beforeMount():void {
		this.scheduleRefresh();
	}

	public beforeDestroy():void {
		clearTimeout(this.timeoutRefresh);
	}

	public onClick():void {
		this.$emit("click", this.index);
	}

	private scheduleRefresh():void {
		this.today = new Date();
		let tomorrow = new Date();
		tomorrow.setHours(tomorrow.getHours()+24);
		tomorrow.setHours(0);
		tomorrow.setMinutes(0);
		tomorrow.setSeconds(0);
		this.timeoutRefresh = setTimeout(this.scheduleRefresh,  tomorrow.getTime() - this.today.getTime() + 1000);//add 1sec for safety
	}

}
</script>

<style scoped lang="less">
@import (reference) '../less/_includes.less';
.checkable{
	width: 100%;
	height: 100%;
	z-index: 1;
	position: relative;
	user-select: none;
	width: 94px;
	height: 94px;
	padding: 3px;
	background-color: #fff;

	.inner {
		position: relative;
		border: 1px solid @mainColor_normal_light;
		width: 100%;
		height: 100%;
		border-radius: 5px;
		display: flex;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
		color: @mainColor_normal_light;
		font-size: 40px;
		font-family: "FuturaLight";
		transition: .25s all;
		background-color: #fff;
		// background-color: @mainColor_normal_extralight;
		cursor: pointer;

		.checkmark {
			width: 70%;
		}

		.steps {
			position: absolute;
			bottom: 3px;
			display: flex;
			flex-direction: row;
			justify-content: center;
			width: 100%;
			height: 10px;
			.star {
				width: 10px;
			}
		}
	}

	&:hover {
		z-index: 2 !important;
		.inner {
			transform: scale(1.25, 1.25);
		}
	}

	&.selected {
		&.today {
			.inner {
				border-color: rgba(255, 255, 255, .5);
			}
		}
		.inner {
			background-color: @mainColor_highlight;
			border-color: transparent;
			color: #fff;
			font-weight: bold;
		}
		&.size2 {
			.inner {
				background-color: spin(@mainColor_highlight, -50%);
			}
			.checkmark {
				width: 75%;
			}
		}
		&.size3 {
			.inner {
				background-color: spin(@mainColor_highlight, -100%);
			}
			.checkmark {
				width: 80%;
			}
		}
		&.size4 {
			.inner {
				background-color: spin(@mainColor_highlight, -150%);
			}
			.checkmark {
				width: 85%;
			}
		}
		&.size5 {
			.inner {
				background-color: spin(@mainColor_highlight, -200%);
			}
			.checkmark {
				width: 90%;
			}
		}
	}

	&.today {
		.inner {
			border-width: 5px;
		}
	}

	&.future {
		filter: saturate(60%);
		pointer-events: none;
	}
}
</style>