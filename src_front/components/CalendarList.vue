<template>
	<div class="calendarlist">
		<Button :icon="icon" @click="open = !open" class="toggle" />

		<transition
		mode="out-in"
		enter-active-class="close"
		leave-active-class="close">
			<div :class="classes" v-if="open">
				<h1>Your calendars</h1>
				<div class="list">
					<Button v-for="c in calendars" :key="c.id"
						:title="c.name"
						:to="{name:'calendar', params:{id:c.id}}"
						@click.native="open = false" />
				</div>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import CalendarData from '../vo/CalendarData';
import Button from './Button.vue';

@Component({
	components:{
		Button,
	}
})
export default class CalendarList extends Vue {

	public open:boolean = false;

	public get calendars():CalendarData[] {
		return this.$store.state.calendars;
	}

	public get icon():string {
		if(this.open) {
			return require('@/assets/icons/cross_white.svg')
		}else{
			return require('@/assets/icons/burger.svg')
		}
	}

	public get classes():string[] {
		let res = ["content"];
		if(!this.open) res.push("close");
		return res;
	}

	public mounted():void {
		
	}

	public beforeDestroy():void {
		
	}

}
</script>

<style scoped lang="less">
@import (reference) '../less/_includes.less';
.calendarlist{
	position: fixed;
	top: 0;
	left: 0;
	max-width: 200px;

	.toggle {
		width: 40px;
		height: 40px;
		border-top-left-radius: 0;
	}

	.content {
		transition: .25s;
		width: 250px;
		padding: 15px;
		box-sizing: border-box;
		background-color: @mainColor_light_extralight;

		h1 {
			font-size: 30px;
		}
	
		.list {
			display: flex;
			flex-direction: column;
			a {
				margin-top: 5px;
				::v-deep .label {
					width: 100%;
					overflow: hidden;
					text-overflow: ellipsis;
				}
			}
		}

		&.close {
			margin-left: -250px;
		}
	}
}
</style>