<template>
	<div class="app">
		<Button :icon="backIcon" class="back" v-if="showBack" @click="back()" />
		<router-view v-slot="{ Component }">
			<transition
			mode="out-in"
			enter-active-class="close"
			leave-active-class="close">
				<component :is="Component" :class="classes" />
			</transition>
		</router-view>
		<CalendarList />
		<ConfirmView />
		<AlertView />
		<Tooltip />
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import backIcon from '@/assets/icons/back.svg';
import Tooltip from './components/Tooltip.vue';
import ConfirmView from './views/Confirm.vue';
import AlertView from './views/AlertView.vue';
import Button from './components/Button.vue';
import CalendarList from './components/CalendarList.vue';

const router = useRouter();

const close = ref<boolean>(true);
const showBack = ref<boolean>(false);

const classes = computed<string[]>(() => {
	let res = ["page"];
	if(close.value) res.push("close");
	return res;
});

onMounted(() => {
	close.value = false;
	// showBack.value = route.name != "home";
});

function back() {
	router.push({name:"home"});
}
</script>

<style scoped lang="less">
.app{
	position: relative;
	min-height: 100vh;
	width: 100%;

	.back {
		width: 40px;
		height: 40px;
		position: fixed;
		top: 5px;
		left: 5px;
	}
}
</style>