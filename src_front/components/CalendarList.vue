<template>
	<div class="calendarlist" v-if="calendars && calendars.length > 0">
		<Button :icon="icon" @click="open = !open" class="toggle" />

		<transition name="close">
			<div :class="classes" v-show="open">
				<h1>Your calendars</h1>
				<div class="list">
					<div v-for="c in calendars" :key="c.id" class="item">
						<Button
							:title="c.name"
							:to="{name:'calendar', params:{id:c.id}}"
							@click.native="open = false"
							class="link" />
						<Button :icon="require('@/assets/icons/delete.svg')" red class="delete" @click="onDelete(c)" />
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import CalendarData from '../vo/CalendarData';
import Button from './Button.vue';
import Utils from '../utils/Utils';

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
		// if(!this.open) res.push("close");
		return res;
	}

	public mounted():void {
		
	}

	public beforeDestroy():void {
		
	}

	public onDelete(data:CalendarData):void {
		Utils.confirm("Delete calendar?", null, "This action cannot be undone!")
		.then(_=> {
			this.$store.dispatch("deleteCalendar", data.id);
		}).catch(e=>{/*ignore*/});
	}

}
</script>

<style scoped lang="less">
.calendarlist{
	position: fixed;
	top: 0;
	left: 0;
	max-width: 200px;
	z-index: 1;

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
		box-shadow: 2px 2px 5px 0px rgba(0,0,0,0.25);

		h1 {
			font-size: 30px;
		}
	
		.list {
			display: flex;
			flex-direction: column;
			.item {
				display: flex;
				flex-direction: row;
				align-items: flex-start;
				margin-top: 5px;
				.link {
					height: 40px;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					flex: 1;
					::v-deep .label {
						width: 100%;
						overflow: hidden;
						text-overflow: ellipsis;
					}
				}
				.delete {
					height: 40px;
					width: 40px;
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
				}
			}
		}

		&.close-enter-active {
			margin-left: -250px;
		}
		&.close-leave-active {
			margin-left: -250px;
		}
	}
}
</style>