<template>
	<div class="calendar frame" v-if="data">
		<div class="head">
			<Button :icon="backIcon" class="back" @click="clickBack()" />
			<div class="title">
				<h1 contenteditable="true" @keydown="onFilterLineBreaks" @blur="updateTitle" ref="titleEl" v-text="data.name"></h1>
				<i>(<img src="@/assets/icons/checkmark.svg">{{countDone}}/{{data.days}})</i>
			</div>
			<Button :icon="qrcodeIcon" class="qrcode" @click="showQRCode = !showQRCode" />
		</div>

		<QRCodeOverlay v-if="showQRCode" class="qrcodeOverlay" />

		<div class="content" v-if="!showQRCode">

			<Button :icon="prevIcon" v-if="showPrev" @click="onPrevHistory" class="prev" />
			<Button :icon="nextIcon" v-if="showNext" @click="onNextHistory" class="next" />
			<Button :icon="showIcon" title="Description" @click="showDescription = !showDescription" class="toggleDescription" />

			<pre v-if="data.description != null && showDescription"
				class="description"
				contenteditable="true"
				@blur="updateDescription"
				ref="descriptionEl" v-text="data.description"></pre>

			<div v-if="historyIndex > 0">{{currHistoryDate}}</div>

			<div class="list" ref="listEl">
				<Checkable
					:index="index"
					:data="daysDone"
					:startDate="startDate"
					@click="onIncrement"
					class="item" v-for="(v, index) in data.days"
					:key="index"
				/>
			</div>

			<div v-if="complete">
				<Button title="Start again" class="restart" @click="restart" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from '../utils/Utils';
import Button from '../components/Button.vue';
import Checkable from '../components/Checkable.vue';
import gsap from 'gsap';
import QRCodeOverlay from './QRCodeOverlay.vue';
import type CalendarData from '../vo/CalendarData';
import { storeMain as useStoreMain } from '@/store/main/storeMain';
import backIcon from '@/assets/icons/back.svg';
import qrcodeIcon from '@/assets/icons/qrcode.svg';
import prevIcon from '@/assets/icons/prev.svg';
import nextIcon from '@/assets/icons/next.svg';
import showIcon from '@/assets/icons/show.svg';

const props = defineProps<{
	id:string;
	dataurl?:string;
}>();

const storeMain = useStoreMain();
const router = useRouter();

const titleEl = useTemplateRef<HTMLHeadingElement>("titleEl");
const descriptionEl = useTemplateRef<HTMLPreElement>("descriptionEl");
const listEl = useTemplateRef<HTMLDivElement>("listEl");

const historyIndex = ref<number>(0);
const data = ref<CalendarData>(null);
const showQRCode = ref<boolean>(false);
const showDescription = ref<boolean>(false);

const currHistory = computed(() => {
	if(historyIndex.value > 0) {
		return data.value.history[data.value.history.length - historyIndex.value];
	}else{
		return null;
	}
});

const currHistoryDate = computed(() => {
	if(!currHistory.value) return null;
	let start = Utils.formatDate(currHistory.value.start);
	let endDate = new Date(currHistory.value.start);
	endDate.setDate(endDate.getDate() + currHistory.value.daysDone.length);
	let end = Utils.formatDate(endDate.toISOString());

	return start+" -> "+end;
});

const countDone = computed<number>(() => {
	if(!data.value.daysDone) return 0;
	let count = 0;
	for (let i = 0; i < data.value.daysDone.length; i++) {
		const element = data.value.daysDone[i];
		if(element > 0) count ++;
	}
	return count;
});

const showPrev = computed<boolean>(() => {
	return data.value.history && data.value.history.length > 0 && historyIndex.value < data.value.history.length;
});

const showNext = computed<boolean>(() => {
	return historyIndex.value > 0;
});

const daysDone = computed<number[]>(() => {
	if(currHistory.value) {
		return currHistory.value.daysDone;
	}else{
		return data.value.daysDone;
	}
});

const startDate = computed<string>(() => {
	if(currHistory.value) {
		return currHistory.value.start;
	}else{
		return data.value.start;
	}
});

const complete = computed<boolean>(() => {
	let now = new Date();
	let d = new Date(data.value.start);
	d.setHours(0);
	d.setMinutes(0);
	d.setSeconds(0);
	const oneDay = 24 * 60 * 60 * 1000;
	const diffDays = Math.ceil(Math.abs((now.getTime() - d.getTime()) / oneDay));
	return diffDays >= data.value.days;
});

onMounted(() => {
	populate();
});

watch(() => props.id, () => populate());

function populate():void {
	let list = storeMain.calendars || [];
	for (let i = 0; i < list.length; i++) {
		const l = list[i];
		if(l.id == props.id) {
			data.value = l;
			storeMain.setData(l);
		}
	}

	nextTick().then(_=> {
		if(!listEl.value) return;
		let elements = listEl.value.children;
		for (let i = 0; i < elements.length; i++) {
			const item = elements[i];
			gsap.set(item, {scaleX:0, scaleY:0, opacity:0})
			gsap.to(item, {duration:1, scaleX:1, delay:.03*i + .5, ease:"elastic.out(1, .5)"})
			gsap.to(item, {duration:1, scaleY:1, delay:.03*i + .55, ease:"elastic.out(1, .5)"})
			gsap.to(item, {duration:.5, opacity:1, delay: .5})
		}
	})
}

function onIncrement(index:number):void {
	storeMain.checkDate(index);
	data.value = storeMain.data;
}

function clickBack():void {
	if(showQRCode.value) {
		showQRCode.value = false;
	}else{
		router.push({name:'home'});
	}
}

function updateTitle():void {
	let t = titleEl.value!.innerText;
	data.value.name = t;
	storeMain.setData(data.value);
}

function updateDescription():void {
	let t = descriptionEl.value!.innerText;
	data.value.description = t;
	storeMain.setData(data.value);
}

function onFilterLineBreaks(event:KeyboardEvent):void {
	if(event.key == "Enter") {
		event.preventDefault();
	}
}

async function restart():Promise<void> {
	try {
		await Utils.confirm("Reset calendar ?", null, "Current calendar will be saved and reset. You'll be able to navigate to your previous calendar(s) to compare your performances.")
	}catch(error) {
		//Refused
		return
	}
	let h = {
		daysDone:JSON.parse(JSON.stringify(data.value.daysDone)),
		start:data.value.start,
	}
	//Save prev state
	if(!data.value.history) {
		data.value.history = [];
	}
	data.value.history.push(h);

	//Reset current state
	for (let i = 0; i < data.value.daysDone.length; i++) {
		data.value.daysDone[i] = 0;
	}
	let d = new Date();
	d.setHours(0);
	d.setMinutes(0);
	data.value.start = d.toISOString();
	data.value.daysDone = [];
	storeMain.setData(data.value);
}

function onPrevHistory():void {
	historyIndex.value ++;
}

function onNextHistory():void {
	historyIndex.value --;
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

		.prev, .next {
			width: 40px;
			height: 40px;
			position: absolute;
			padding-left: 10px;
			padding-right: 12px;
			&.next {
				padding-right: 10px;
				padding-left: 12px;
				right: 20px;
			}
		}

		.list {
			width: 100%;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
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