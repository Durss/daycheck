<template>
	<div :class="(hidden? 'hidden ' : '') + 'confirm'">
		<div class="dimmer" ref="dimmer" @click="answer(false)"></div>
		<div class="holder" ref="holder">
			<div class="title" v-html="title"></div>
			<div class="description" v-html="description"></div>
			<div class="buttons">
				<button type="button" class="cancel" @click="answer()">No</button>
				<button @click="answer(true)" class="dark confirmBt">Yes</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import gsap from "gsap";
import { storeMain as useStoreMain } from '@/store/main/storeMain';

const storeMain = useStoreMain();

const dimmer = useTemplateRef<HTMLDivElement>("dimmer");
const holder = useTemplateRef<HTMLDivElement>("holder");

const title = ref<string>("");
const description = ref<string>("");
const hidden = ref<boolean>(true);

const keyUpHandler = (e:KeyboardEvent) => onKeyUp(e);

onMounted(() => {
	document.addEventListener("keyup", keyUpHandler);
});

onBeforeUnmount(() => {
	document.removeEventListener("keyup", keyUpHandler);
});

watch(() => storeMain.confirm, () => onConfirmChanged(), { immediate: true, deep: true });

function onConfirmChanged() {
	let isHidden = !storeMain.confirm || !storeMain.confirm.title;

	if(hidden.value == isHidden) return;//No change, ignore

	if(!isHidden) {
		hidden.value = isHidden;
		title.value = storeMain.confirm.title;
		description.value = storeMain.confirm.description;
		(<HTMLElement>document.activeElement)?.blur();//avoid clicking again on focused button if submitting confirm via SPACE key
		gsap.killTweensOf([holder.value, dimmer.value]);
		gsap.set(holder.value, {marginTop:0, opacity:1});
		gsap.to(dimmer.value, {duration:.5, opacity:1});
		gsap.from(holder.value, {duration:.5, marginTop:100, opacity:0, ease:"back.out"});
	}else{
		gsap.killTweensOf([holder.value, dimmer.value]);
		gsap.to(dimmer.value, {duration:.5, opacity:0});
		gsap.to(holder.value, {duration:.5, marginTop:100, opacity:0, ease:"back.in", onComplete:()=> {
			hidden.value = true;
		}});
	}
}

function onKeyUp(e:KeyboardEvent):void {
	if(hidden.value) return;
	if(e.key == "Enter" || e.key == " ") {//Enter / space
		answer(true);
		e.preventDefault();
		e.stopPropagation();
	}
	if(e.key == "Escape") {//escape
		answer(false);
		e.preventDefault();
		e.stopPropagation();
	}
}

function answer(confirm?:boolean):void {
	if(!storeMain.confirm) return;

	if(confirm) {
		if(storeMain.confirm.confirmCallback) {
			storeMain.confirm.confirmCallback();
		}
	}else{
		if(storeMain.confirm.cancelCallback) {
			storeMain.confirm.cancelCallback();
		}
	}
	storeMain.confirm = null;
}
</script>

<style lang="less" scoped>
.confirm {
	z-index: 99;
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;

	&.hidden {
		display: none;
	}
	.dimmer {
		position: absolute;
		top: 0;
		left: 0;
		background-color: rgba(0,0,0,.5);
		width: 100%;
		height: 100%;
	}

	.holder {
		.center();
		position: absolute;
		background-color: #fff;
		padding: 30px;
		width: 400px;
		box-sizing: border-box;
		border-radius: 20px;

		.title {
			font-size: 25px;
			font-weight: bold;
			text-align: center;
			font-family: "CircularPro";
		}

		.description {
			margin-top: 20px;
			font-family: "FuturaLight";
		}

		.buttons {
			display: flex;
			flex-direction: row;
			max-width: 220px;
			margin: auto;
			margin-top: 30px;
			justify-content: space-between;

			button {
				width: 100px;
				&.confirmBt {
					background-color: @mainColor_highlight;
					&:hover {
						background-color: @mainColor_highlight_light;
					}
				}
			}
		}
	}
}

@media only screen and (max-width: 500px) {
	.confirm {
		.holder {
			padding: 15px;
			width: 90vw;

			.title {
				font-size: 22px;
			}

			.buttons {
				margin-top: 15px;
				button {
					font-size: 18px;
					padding: 10px;
				}
			}
		}
	}
}

@media only screen and (max-width: 360px) {
	.confirm {
		.holder {
			padding: 15px;
			width: 90vw;

			.title {
				font-size: 20px;
			}

			.buttons {
				margin-top: 15px;
				button {
					font-size: 15px;
					padding: 10px;
				}
			}
		}
	}
}
</style>

<style lang="less">

.confirm {

	.holder {
		.description {
			strong {
				color: @mainColor_warn;
				font-weight: bold;
			}
		}
	}
}
</style>