<template>
	<div :class="classes">
		<div class="head">
			<div class="title">
				<h1>Create a calendar</h1>
			</div>
		</div>
		<div class="content">
			<div class="infos">You want to push yourself doing a task every day ? Create a calendar and track your progress everyday.</div>
			<form @submit.prevent="onSubmit()">
				<div class="formLine">
					<label for="name" data-tooltip="Name your calendar, in case you forgot the thing you wanted to do...">Task name <sup>*</sup></label>
					<input type="text" id="name" v-model="name" placeholder="name" :maxlength="CALENDAR_LIMITS.name">
				</div>
				<div class="formLine">
					<label for="days" data-tooltip="Number of days you want to do your thing, or endless to keep going with no end date">Duration *</label>
					<div class="duration">
						<button type="button" :class="{selected:!endless}" @click="endless = false">Days</button>
						<button type="button" :class="{selected:endless}" @click="endless = true">Endless ∞</button>
					</div>
					<input type="number" min="1" max="365" id="days" v-model="days" v-if="!endless">
				</div>
				<div class="formLine">
					<label for="description" data-tooltip="Add a description if you want to be sure you remember the thing you want to do every day" @click="openDescription = !openDescription" class="description">{{"Task description "+(openDescription? "▼" : "►")}}</label>
					<textarea type="text" id="description" v-model="description" placeholder="description" v-if="openDescription" :maxlength="CALENDAR_LIMITS.description"></textarea>
				</div>
				<Button type="submit" title="Create" :loading="loading" class="submit" :disabled="!canSubmit" />
				<div class="small">* : mandatory</div>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Button from '../components/Button.vue';
import { storeMain as useStoreMain } from '@/store/main/storeMain';
import { CALENDAR_LIMITS } from '@/vo/CalendarData';

const storeMain = useStoreMain();

const loading = ref<boolean>(false);
const openDescription = ref<boolean>(false);
const name = ref<string>("");
const description = ref<string>("");
const days = ref<number>(30);
const endless = ref<boolean>(false);

const canSubmit = computed<boolean>(() => {
	if(!name.value) return false;
	//Force parsing as int. For some reason if user write manually in the field, the var type becomes a string...
	return endless.value || parseInt(<any>days.value) >= 1;
});

const classes = computed<string[]>(() => {
	let res = ["home", "frame"];
	return res;
});

function onSubmit():void {
	if(!canSubmit.value) return;
	storeMain.createCalendar({
		name:name.value,
		days:endless.value? null : parseInt(<any>days.value),
		description:description.value,
	})
}
</script>

<style scoped lang="less">
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

			.duration {
				display: flex;
				flex-direction: row;
				margin-top: 5px;
				button {
					flex: 1;
					border-radius: 0;
					color: @mainColor_dark;
					background-color: @mainColor_light_light;
					&:first-child {
						border-top-left-radius: 20px;
						border-bottom-left-radius: 20px;
					}
					&:last-child {
						border-top-right-radius: 20px;
						border-bottom-right-radius: 20px;
					}
					&.selected {
						color: #fff;
						background-color: @mainColor_normal;
					}
				}
			}
		}
	}
}
</style>