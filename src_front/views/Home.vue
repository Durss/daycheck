<template>
	<div :class="classes" @leave="test()">
		<div class="head">
			<h1>Create a calendar</h1>
		</div>
		<div class="content">
			<div class="infos">You want to push yourself doing a task every day ? Create a calendar and track your progress everyday.</div>
			<form @submit.prevent="onSubmit()">
				<div class="formLine">
					<label for="name" data-tooltip="Name your calendar, in case you forgot the thing you wanted to do...">Task name <sup>*</sup></label>
					<input type="text" id="name" v-model="name" placeholder="name">
				</div>
				<div class="formLine">
					<label for="days" data-tooltip="Number of days you want to do your thing">Number of days *</label>
					<input type="number" min="1" max="365" id="days" v-model="days">
				</div>
				<div class="formLine">
					<label for="description" data-tooltip="Add a description if you want to be sure you remember the thing you want to do every day" @click="openDescription = !openDescription" class="description">{{"Task description "+(openDescription? "▼" : "►")}}</label>
					<textarea type="text" id="description" v-model="description" placeholder="description" v-if="openDescription"></textarea>
				</div>
				<Button type="submit" title="Create" :loading="loading" class="submit" :disabled="name==null || name.length == 0" />
				<div class="small">* : mandatory</div>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import Button from '../components/Button.vue';

@Component({
	components:{
		Button,
	}
})
export default class Home extends Vue {

	public loading:boolean = false;
	public openDescription:boolean = false;
	public name:string = "";
	public description:string = "";
	public days:number = 30;

	public get classes():string[] {
		let res = ["home", "frame"];
		return res;
	}


	public mounted():void {
		
	}

	public beforeDestroy():void {
	}

	public onSubmit():void {
		this.$store.dispatch("createCalendar", {
			name:this.name,
			days:parseInt(<any>this.days),//Force parsing as int. For some reason if user write manually in the field, the var type becomes a string...
			description:this.description,
		})
	}

}
</script>

<style scoped lang="less">
@import (reference) '../less/_includes.less';
.home{
	width: 400px;
	max-width: 80%;
	.content {
		.infos {
			margin-bottom: 20px;
			font-family: "FuturaLight";
			text-align: center;
		}

		.submit {
			margin: auto;
			display: block;
		}
		.small {
			color: @mainColor_dark_light;
			font-style: italic;
			font-size: 14px;
			text-align: right;
		}

		.formLine {
			.description {
				cursor: pointer;
			}
		}
	}
}
</style>