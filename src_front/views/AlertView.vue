<template>
	<div class="alert" v-if="message && message.length > 0" @click="close()" ref="rootEl">
		<p v-html="message" class="label"></p>
	</div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import gsap from "gsap";
import { storeMain as useStoreMain } from '@/store/main/storeMain';

const storeMain = useStoreMain();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

const message = ref<string|null>("");

onMounted(() => {
	if(storeMain.alert) {
		onWatchAlert();
	}
});

watch(() => storeMain.alert, () => onWatchAlert());

function onWatchAlert():void {
	let mess = storeMain.alert;
	if(mess && mess.length > 0) {
		message.value = mess;
		nextTick().then(_=> {
			rootEl.value!.removeAttribute("style");
			gsap.from(rootEl.value!, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.out"});
			setTimeout(_=> close(), 6000);
		});
	}else{
		nextTick().then(_=> {
			if(!rootEl.value) return;
			gsap.to(rootEl.value, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.in", onComplete:()=> {
				message.value = null;
			}});
		});
	}
}

function close():void {
	storeMain.alert = null;
}
</script>

<style lang="less">
.alert {
	background-color: #c00;
	color: #fff;
	padding: 20px 0;
	width: 100%;
	position: absolute;
	overflow: hidden;
	z-index: 1;
	position: absolute;
	top: 0;
	cursor: pointer;

	.label {
		max-width: 600px;
		margin: auto;
		padding: 0 30px 0 10px;
		text-align: center;
		&::after {
			content: "X";
			color: #fff;
			position: absolute;
			top: 16px;
			right: 10px;
			padding-left: 20px;
			font-size: 20px;
		}
	}
}
</style>