<template>
	<div class="calendar frame" v-if="data">
		<div class="head">
			<Button :icon="backIcon" class="back" @click="clickBack()" />
			<div class="title">
				<h1 contenteditable="true" @keydown="onFilterLineBreaks" @blur="updateTitle" ref="titleEl" v-text="data.name"></h1>
				<i>(<img src="@/assets/icons/checkmark.svg">{{countDone}}/{{data.days || "∞"}})</i>
			</div>
			<Button :icon="qrcodeIcon" class="qrcode" @click="showQRCode = !showQRCode" />
		</div>

		<QRCodeOverlay v-if="showQRCode" class="qrcodeOverlay" />

		<div class="content" v-if="!showQRCode">

			<Button :icon="showIcon" title="Description" @click="showDescription = !showDescription" class="toggleDescription" />

			<pre v-if="data.description != null && showDescription"
				class="description"
				contenteditable="true"
				@blur="updateDescription"
				ref="descriptionEl" v-text="data.description"></pre>

			<div class="month">
				<Button :icon="prevIcon" @click="changeMonth(-1)" class="prev" :class="{hidden:!canPrev}" />
				<h2>{{monthLabel}}</h2>
				<Button :icon="nextIcon" @click="changeMonth(1)" class="next" :class="{hidden:!canNext}" />
			</div>

			<div class="runs">
				<div v-for="(run, i) in monthRuns" :key="run.start+'_'+i" :class="['run', {current:run.current}]">
					{{DateUtils.format(run.start)}} → {{run.end? DateUtils.format(run.end) : "∞"}}
					<span class="score" v-if="run.days">(✓ {{run.done}}/{{run.days}})</span>
					<span class="score" v-else>(✓ {{run.done}} in {{run.elapsed}} {{run.elapsed > 1? "days" : "day"}})</span>
				</div>
			</div>

			<div class="weekdays">
				<span v-for="d in DateUtils.WEEK_DAYS" :key="d">{{d}}</span>
			</div>

			<div class="list" ref="listEl">
				<div class="blank" v-for="i in leadingBlanks" :key="'blank_'+i"></div>
				<Checkable
					v-for="cell in cells"
					:key="cell.date"
					class="item"
					:date="cell.date"
					:value="cell.value"
					:today="cell.today"
					:active="cell.active"
					:clickable="cell.clickable"
					:tooltip="cell.tooltip"
					@click="onCheck"
				/>
			</div>

			<div v-if="complete">
				<Button title="Start again" class="restart" @click="restart" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from '../utils/Utils';
import DateUtils from '../utils/DateUtils';
import Button from '../components/Button.vue';
import Checkable from '../components/Checkable.vue';
import gsap from 'gsap';
import QRCodeOverlay from './QRCodeOverlay.vue';
import type CalendarData from '../vo/CalendarData';
import { CALENDAR_LIMITS } from '../vo/CalendarData';
import { storeMain as useStoreMain } from '@/store/main/storeMain';
import backIcon from '@/assets/icons/back.svg';
import qrcodeIcon from '@/assets/icons/qrcode.svg';
import prevIcon from '@/assets/icons/prev.svg';
import nextIcon from '@/assets/icons/next.svg';
import showIcon from '@/assets/icons/show.svg';

interface Run {
	/** First day of the run ("YYYY-MM-DD") */
	start:string;
	/** Duration of the run in days, null if endless */
	days:number|null;
	/** Last day of the run ("YYYY-MM-DD"), null if endless */
	end:string|null;
	current:boolean;
}

interface Cell {
	date:string;
	value:number;
	today:boolean;
	active:boolean;
	clickable:boolean;
	tooltip:string;
}

const props = defineProps<{
	id:string;
	dataurl?:string;
}>();

const storeMain = useStoreMain();
const router = useRouter();

const titleEl = useTemplateRef<HTMLHeadingElement>("titleEl");
const descriptionEl = useTemplateRef<HTMLPreElement>("descriptionEl");
const listEl = useTemplateRef<HTMLDivElement>("listEl");

/** Opened calendar, kept in the store so it stays up to date when synced with the server */
const data = computed<CalendarData|null>(() => storeMain.data);
const showQRCode = ref<boolean>(false);
const showDescription = ref<boolean>(false);
/** Today as "YYYY-MM-DD", refreshed at midnight */
const today = ref<string>(DateUtils.todayKey());
/** Displayed month as "YYYY-MM" */
const month = ref<string>(monthOf(today.value));

let todayTimeout:ReturnType<typeof setTimeout> = null;

/**
 * All runs, oldest first, the current one being the last
 */
const runs = computed<Run[]>(() => {
	const list:{start:string, days:number|null}[] = [...(data.value.history || []), {start:data.value.start, days:data.value.days}];
	return list.map((r, i) => ({
		...r,
		end: r.days? DateUtils.addDays(r.start, r.days - 1) : null,
		current: i == list.length - 1,
	}));
});

const currentRun = computed<Run>(() => runs.value[runs.value.length - 1]);

const countDone = computed<number>(() => countRun(currentRun.value));

/** Is the current run over (endless runs never are) */
const complete = computed<boolean>(() => currentRun.value.end != null && today.value >= currentRun.value.end);

const monthStart = computed<string>(() => month.value+"-01");

const monthEnd = computed<string>(() => {
	const d = DateUtils.fromKey(monthStart.value);
	return DateUtils.toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
});

const monthLabel = computed<string>(() => {
	return DateUtils.fromKey(monthStart.value).toLocaleDateString("en-US", {month:"long", year:"numeric"});
});

/**
 * Number of empty cells before the 1st of the month (weeks start on monday)
 */
const leadingBlanks = computed<number>(() => (DateUtils.fromKey(monthStart.value).getDay() + 6) % 7);

const minMonth = computed<string>(() => monthOf(runs.value.reduce((min, r) => r.start < min? r.start : min, data.value.start)));

const maxMonth = computed<string>(() => {
	const end = currentRun.value.end;
	return monthOf(end && end > today.value? end : today.value);
});

const canPrev = computed<boolean>(() => month.value > minMonth.value);

const canNext = computed<boolean>(() => month.value < maxMonth.value);

/**
 * Runs overlapping the displayed month
 */
const monthRuns = computed(() => {
	return runs.value
		.filter(r => r.start <= monthEnd.value && (r.end == null || r.end >= monthStart.value))
		.map(r => ({
			...r,
			done: countRun(r),
			/** Days elapsed since the beginning of the run, today included */
			elapsed: Math.max(0, DateUtils.diffDays(r.start, today.value) + 1),
		}));
});

const cells = computed<Cell[]>(() => {
	const res:Cell[] = [];
	const checks = data.value.checks || {};
	const count = DateUtils.diffDays(monthStart.value, monthEnd.value) + 1;
	for (let i = 0; i < count; i++) {
		const date = DateUtils.addDays(monthStart.value, i);
		const run = getRun(date);
		const isToday = date == today.value;
		let tooltip = "";
		if(run) tooltip = "Day "+(DateUtils.diffDays(run.start, date) + 1)+(run.days? "/"+run.days : "");
		if(isToday) tooltip = tooltip? "Today - "+tooltip : "Today";
		res.push({
			date,
			value: checks[date] || 0,
			today: isToday,
			active: run != null,
			clickable: isToday && run != null,
			tooltip,
		});
	}
	return res;
});

onMounted(() => {
	scheduleTodayRefresh();
	document.addEventListener("visibilitychange", onVisibilityChange);
	populate();
});

onBeforeUnmount(() => {
	clearTimeout(todayTimeout);
	document.removeEventListener("visibilitychange", onVisibilityChange);
});

watch(() => props.id, () => populate());

/**
 * Get the "YYYY-MM" month of a "YYYY-MM-DD" day
 */
function monthOf(date:string):string {
	return date.substring(0, 7);
}

/**
 * Get the run containing the given day, most recent run first
 */
function getRun(date:string):Run | null {
	for (let i = runs.value.length - 1; i >= 0; i--) {
		const r = runs.value[i];
		if(isInRun(date, r)) return r;
	}
	return null;
}

function isInRun(date:string, run:Run):boolean {
	return date >= run.start && (run.end == null || date <= run.end);
}

/**
 * Counts the checked days of a run
 */
function countRun(run:Run):number {
	const checks = data.value.checks || {};
	let count = 0;
	for (const date in checks) {
		if(checks[date] > 0 && isInRun(date, run)) count ++;
	}
	return count;
}

function scheduleTodayRefresh():void {
	clearTimeout(todayTimeout);
	today.value = DateUtils.todayKey();
	const now = new Date();
	const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	todayTimeout = setTimeout(scheduleTodayRefresh, tomorrow.getTime() - now.getTime() + 1000);//add 1sec for safety
}

/**
 * Timers may be delayed while the device sleeps, refresh the current day when the page is back
 */
function onVisibilityChange():void {
	if(document.visibilityState == "visible") scheduleTodayRefresh();
}

function populate():void {
	storeMain.openCalendar(props.id);
	month.value = monthOf(today.value);
	animateCells(.5);
}

function animateCells(delay:number):void {
	nextTick().then(_=> {
		if(!listEl.value) return;
		let elements = listEl.value.children;
		for (let i = 0; i < elements.length; i++) {
			const item = elements[i];
			gsap.killTweensOf(item);
			gsap.set(item, {scaleX:0, scaleY:0, opacity:0})
			gsap.to(item, {duration:1, scaleX:1, delay:.02*i + delay, ease:"elastic.out(1, .5)"})
			gsap.to(item, {duration:1, scaleY:1, delay:.02*i + delay + .05, ease:"elastic.out(1, .5)"})
			gsap.to(item, {duration:.5, opacity:1, delay})
		}
	})
}

function changeMonth(delta:number):void {
	const d = DateUtils.fromKey(monthStart.value);
	const target = monthOf(DateUtils.toKey(new Date(d.getFullYear(), d.getMonth() + delta, 1)));
	if(target < minMonth.value || target > maxMonth.value) return;
	month.value = target;
	animateCells(0);
}

function onCheck(date:string):void {
	storeMain.checkDate(date);
}

function clickBack():void {
	if(showQRCode.value) {
		showQRCode.value = false;
	}else{
		router.push({name:'home'});
	}
}

function updateTitle():void {
	const name = titleEl.value!.innerText.substring(0, CALENDAR_LIMITS.name);
	if(name == data.value.name) return;
	storeMain.updateCalendar({name});
}

function updateDescription():void {
	const description = descriptionEl.value!.innerText.substring(0, CALENDAR_LIMITS.description);
	if(description == data.value.description) return;
	storeMain.updateCalendar({description});
}

function onFilterLineBreaks(event:KeyboardEvent):void {
	if(event.key == "Enter") {
		event.preventDefault();
	}
}

async function restart():Promise<void> {
	try {
		await Utils.confirm("Start again ?", null, "A new "+data.value.days+" days run will start. Your previous runs stay visible by browsing past months so you can compare your performances.")
	}catch(error) {
		//Refused
		return
	}
	storeMain.restartCalendar();
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
		:deep(.icon) {
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

		.month {
			display: flex;
			flex-direction: row;
			align-items: center;
			margin-bottom: 5px;

			h2 {
				flex: 1;
				text-align: center;
				font-family: "CircularPro";
				font-weight: bold;
				font-size: 26px;
				color: @mainColor_normal;
			}

			.prev, .next {
				flex-shrink: 0;
				width: 40px;
				height: 40px;
				padding-left: 10px;
				padding-right: 12px;
				&.next {
					padding-right: 10px;
					padding-left: 12px;
				}
				&.hidden {
					visibility: hidden;
				}
			}
		}

		.runs {
			min-height: 10px;
			margin-bottom: 10px;
			text-align: center;
			font-family: "FuturaLight";
			font-size: 15px;
			color: @mainColor_dark;
			.run:not(.current) {
				opacity: .6;
			}
			.score {
				white-space: nowrap;
			}
		}

		.weekdays, .list {
			width: 100%;
			display: grid;
			grid-template-columns: repeat(7, minmax(0, 1fr));
		}

		.weekdays {
			margin-bottom: 5px;
			text-align: center;
			font-size: 14px;
			color: @mainColor_normal_light;
		}

		.list {
			//Lets cells scale their content according to the grid width
			container-type: inline-size;
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
			padding: 10px;
			.list .item {
				padding: 2px;
			}
		}
	}
}

</style>
