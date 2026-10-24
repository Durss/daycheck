<template>
	<div :class="classes" @click="onClick" :data-tooltip="tooltip">
		<div class="inner">
			<span v-if="value==0">{{props.index+1}}</span>
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

<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, ref } from "vue";

const props = defineProps<{
	data:number[];
	startDate:string;
	index:number;
}>();

const emit = defineEmits<{
	click: [index:number];
}>();

let timeoutRefresh:ReturnType<typeof setTimeout> = null;
const today = ref<Date>(null);

const date = computed<Date>(() => {
	let d = new Date(props.startDate);
	d.setDate(d.getDate() + props.index);
	return d;
});

const isToday = computed<boolean>(() => {
	return date.value.getDate() == today.value.getDate()
	&& date.value.getMonth() == today.value.getMonth()
	&& date.value.getFullYear() == today.value.getFullYear();
});

const isFuture = computed<boolean>(() => {
	return !isToday.value;
});

const tooltip = computed<string>(() => {
	if(isToday.value) return "Today";
	return "";
});

const value = computed<number>(() => {
	let daysDone = props.data;
	return daysDone && daysDone[props.index]? daysDone[props.index] : 0;
});

const classes = computed<string[]>(() => {
	let res = ["checkable"];
	if(value.value>0) res.push("selected");
	if(isToday.value) res.push("today");
	if(isFuture.value) res.push("future");
	if(value.value>0) res.push("size"+value.value);
	return res;
});

onBeforeMount(() => {
	scheduleRefresh();
});

onBeforeUnmount(() => {
	clearTimeout(timeoutRefresh);
});

function onClick():void {
	emit("click", props.index);
}

function scheduleRefresh():void {
	today.value = new Date();
	let tomorrow = new Date();
	tomorrow.setHours(tomorrow.getHours()+24);
	tomorrow.setHours(0);
	tomorrow.setMinutes(0);
	tomorrow.setSeconds(0);
	timeoutRefresh = setTimeout(scheduleRefresh,  tomorrow.getTime() - today.value.getTime() + 1000);//add 1sec for safety
}
</script>

<style scoped lang="less">
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