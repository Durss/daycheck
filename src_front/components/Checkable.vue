<template>
	<div :class="classes" @click="onClick" :data-tooltip="props.tooltip">
		<div class="inner">
			<span v-if="value==0">{{dayOfMonth}}</span>
			<img src="@/assets/icons/checkmark.svg" alt="check" v-if="value>0" class="checkmark">
			<div class="steps" v-if="value>0">
				<img src="@/assets/icons/star.svg" alt="star" v-for="i in value" :key="i" class="star">
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
	/** Day represented by this cell ("YYYY-MM-DD") */
	date:string;
	/** Check level, 0 to 5 */
	value:number;
	today?:boolean;
	/** Is this day part of a run */
	active?:boolean;
	clickable?:boolean;
	tooltip?:string;
}>(), {
	today: false,
	active: false,
	clickable: false,
	tooltip: "",
});

const emit = defineEmits<{
	click: [date:string];
}>();

const dayOfMonth = computed<number>(() => parseInt(props.date.split("-")[2]));

const classes = computed<string[]>(() => {
	let res = ["checkable"];
	if(props.value>0) res.push("selected", "size"+props.value);
	if(props.today) res.push("today");
	if(!props.clickable) res.push("locked");
	if(!props.active) res.push("off");
	return res;
});

function onClick():void {
	if(!props.clickable) return;
	emit("click", props.date);
}
</script>

<style scoped lang="less">
.checkable{
	z-index: 1;
	position: relative;
	user-select: none;
	aspect-ratio: 1;
	min-width: 0;
	padding: 3px;
	box-sizing: border-box;
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
		//Scales with the calendar grid width (container defined by parent)
		font-size: clamp(14px, 6cqi, 36px);
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
			.star {
				width: clamp(4px, 1.6cqi, 10px);
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
			border-width: clamp(3px, .8cqi, 5px);
		}
	}

	&.locked {
		filter: saturate(60%);
		.inner {
			cursor: default;
		}
		&:hover .inner {
			transform: none;
		}
	}

	&.off:not(.selected) {
		.inner {
			border-color: @mainColor_normal_extralight;
			color: @mainColor_normal_extralight;
		}
	}
}
</style>