<template>
	<div class="app">
		<Button :icon="require('@/assets/icons/back.svg')" class="back" v-if="showBack" @click="back()" />
		<transition
		mode="out-in"
		enter-active-class="close"
		leave-active-class="close">
			<router-view :class="classes" ref="page" mode="out-in"></router-view>
		</transition>
		<ConfirmView />
		<AlertView />
		<Tooltip />
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import Tooltip from './components/Tooltip.vue';
import ConfirmView from './views/Confirm.vue';
import AlertView from './views/AlertView.vue';
import Button from './components/Button.vue';

@Component({
	components:{
		Button,
		Tooltip,
		AlertView,
		ConfirmView
	}
})
export default class App extends Vue {

	public from:any;
	public close:boolean = true;
	public showBack:boolean = false;

	public get classes():string[] {
		let res = ["page"];
		if(this.close) res.push("close");
		return res;
	}

	public mounted():void {
		this.close = false;
		// this.showBack = this.$route.name != "home";
	}

	public beforeDestroy():void {
		
	}

	@Watch("$route")
	public onRouteChange(to, from):void {
		this.from = <any>this.$refs.page;
		// this.showBack = to.name != "home";
	}

	public back() {
		this.$router.push({name:"home"});
	}

}
</script>

<style scoped lang="less">
@import (reference) './less/_includes.less';
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