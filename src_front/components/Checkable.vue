<template>
	<div :class="classes" @click="onClick">
		<div class="inner">
			<span v-if="!selected">{{index+1}}</span>
			<img src="@/assets/icons/checkmark.svg" alt="check" v-if="selected" class="checkmark">
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";

@Component({
	components:{}
})
export default class Checkable extends Vue {

	@Prop()
	public index:number;

	public selected:boolean = false;

	public get classes():string[] {
		let res = ["checkable"];
		if(this.selected) res.push("selected");
		return res;
	}

	public mounted():void {
		let done = this.$store.state.data.daysDone
		this.selected = done && done[this.index] === true;
	}

	public beforeDestroy():void {
		
	}

	public onClick():void {
		this.selected = !this.selected;
		this.$emit("change", this.index, this.selected);
	}

}
</script>

<style scoped lang="less">
@import (reference) '../less/_includes.less';
.checkable{
	width: 100%;
	height: 100%;
	z-index: 1;
	position: relative;
	user-select: none;

	.inner {
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
	}

	&:hover {
		z-index: 2 !important;
		.inner {
			transform: scale(1.25, 1.25);
		}
	}

	&.selected {
		.inner {
			background-color: @mainColor_highlight;
			border-color: @mainColor_highlight;
			color: #fff;
			font-weight: bold;
		}
	}
}
</style>