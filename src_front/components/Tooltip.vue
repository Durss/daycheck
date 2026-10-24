<template>
  <div class="tooltip" ref="rootEl">
	  <div class="holder" :class="upsideDown? 'upsideDown' : ''" ref="holder" v-show="opened" key="tooltip">
		  <div ref="content"></div>
		  <div class="tip"></div>
	  </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import gsap from "gsap";
import { storeMain as useStoreMain } from '@/store/main/storeMain';

const storeMain = useStoreMain();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const holder = useTemplateRef<HTMLDivElement>("holder");
const content = useTemplateRef<HTMLDivElement>("content");

const upsideDown = ref<boolean>(false);
const opened = ref<boolean>(false);

let currentContent:string;
let mouseMoveHandler:(e:MouseEvent) => void;
let currentTarget:HTMLElement;
let lastMouseEvent:MouseEvent;

onMounted(() => {
	initialize();
});

onBeforeUnmount(() => {
	document.removeEventListener('mousemove', mouseMoveHandler);
});

watch(() => storeMain.tooltip, () => tooltipStateChange());

function tooltipStateChange():void {
	let data = storeMain.tooltip;
	if(data) {
		show(data);
	}else{
		hide();
	}
}

/**
 * Opens the tooltip
 * @param value
 */
function show(value:string):void {
	if(storeMain.mobile) return;
	if(currentContent == value && opened.value) return;
	opened.value = true;
	currentContent = value;
	content.value!.innerHTML = value;
	gsap.killTweensOf(rootEl.value!);
	gsap.to(rootEl.value!, {duration:.2, opacity:1});

	if(lastMouseEvent) {
		nextTick().then(_=> {
			onMouseMove(lastMouseEvent, false);
		})
	}
}

/**
 * Hides the tooltip
 */
function hide():boolean {
	if(!opened.value) return false;
	opened.value = false;
	gsap.killTweensOf(rootEl.value!);
	gsap.to(rootEl.value!, {duration:.2, opacity:0, onComplete:()=>onHideComplete()});
	return true;
}

/**
 * Initializes the class
 */
function initialize():void {
	opened.value = false;

	gsap.set(rootEl.value!, {opacity:0});
	mouseMoveHandler = (e:MouseEvent) => onMouseMove(e);
	document.addEventListener('mousemove', mouseMoveHandler);
}

/**
 * Moves the tooltip
 * @param e
 */
function onMouseMove(e:MouseEvent, checkTarget:boolean = true):void {
	lastMouseEvent = e;
	if(checkTarget) {
		let target:HTMLDivElement = <HTMLDivElement>e.target;
		while(target && target != document.body) {
			if(target.dataset && target.dataset.tooltip) break;
			target = <HTMLDivElement>target.parentNode;
		}
		//Target can be null if pressing mouse inside window and moving outside browser while keeping mouse pressed (at least on chrome)
		if(target && target != document.body) {
			storeMain.openTooltip(target.dataset.tooltip);
		}else if(opened.value) {
			storeMain.closeTooltip();
		}
	}

	if(!opened.value) return;

	let holderEl = holder.value!;
	let px:number = (e.clientX - holderEl.clientWidth * .5);
	let py:number = (e.clientY - holderEl.clientHeight - 20);
	px = Math.max(0, Math.min(window.innerWidth - holderEl.clientWidth, px))
	py = Math.max(0, Math.min(window.innerHeight - holderEl.clientHeight, py))
	if(py < 50) {
		py = e.clientY + 30;
		upsideDown.value = true;
	}else{
		upsideDown.value = false;
	}
	holderEl.style.left = px+'px';
	holderEl.style.top = py+'px';

	//Deep check if current hover item is still on DOM
	//Vue can remove/recreate items anytime, in this case
	//"mouseout" event is not fired which blocks the tooltip
	if(currentTarget) {
		let t:any = currentTarget;
		while(t.parentNode && t.parentNode != document.body){
			t = t.parentNode;
		}
		if(!t || !t.parentNode) {
			currentTarget = null;
			storeMain.closeTooltip();
		}
	}
}

/**
 * Called when hidding completes
 */
function onHideComplete():void {
	opened.value = false;
}
</script>

<style scoped lang="less">
.tooltip{
	position: fixed;
	pointer-events: none;
	z-index: 100;
	.holder {
		position: fixed;
		display: inline;
		color: #fff;
		padding: 8px;
		border-radius: 10px;
		background-color: @mainColor_highlight;
		max-width: 300px;
		text-align: justify;
		font-size: 16px;

		.tip {
			border-left: 10px solid transparent;
			border-right: 10px solid transparent;
			border-top: 12px solid @mainColor_highlight;
			bottom: -12px;
			position: absolute;
			width: 0;
			left:50%;
			transform: translate(-50%, 0);
		}

		&.upsideDown {
			.tip {
				border-left: 10px solid transparent;
				border-right: 10px solid transparent;
				border-top: none;
				border-bottom: 12px solid @mainColor_highlight;
				top: -12px;
				bottom: auto;
				position: absolute;
				width: 0;
				left:50%;
				transform: translate(-50%, 0);
			}
		}
	}
}
</style>
<style lang="less">
.tooltip{
	.holder {
		strong {
			color: @mainColor_warn;
			background-color: rgba(255, 255, 255, .5);
			text-shadow: 1px 1px 1px #fff;
			border-radius: 5px;
			padding: 0 5px;
			line-height: 20px;
		}
	}
}
</style>