<template>
	<component
	:class="classes"
	:is="nodeType"
	:type="props.type"
	:target="props.target"
	:to="props.to"
	@click="emit('click')">
		<img :src="parsedIcon" v-if="parsedIcon" alt="icon" class="icon" :class="props.loading? 'hide' : 'show'">
		<img v-if="props.loading" src="@/assets/loader/loader.svg" alt="icon" class="spinner">
		<span class="label" :class="props.loading? 'hide' : 'show'" v-if="props.title" v-html="props.title"></span>
	</component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";

const props = withDefaults(defineProps<{
	icon?:string;
	iconSelected?:string;
	title?:string;
	loading?:boolean;
	type?:string;
	target?:string;
	to?:RouteLocationRaw;
	white?:boolean;
	red?:boolean;
	selected?:boolean;
	disabled?:boolean;
}>(), {
	loading: false,
	type: "button",
	to: null,
	white: false,
	red: false,
	selected: false,
	disabled: false,
});

const emit = defineEmits<{
	click: [];
}>();

const nodeType = computed(() => {
	if(props.to) return RouterLink;
	return "button";
});

const parsedIcon = computed<string>(() => {
	if(props.selected !== false && props.iconSelected) {
		return props.iconSelected;
	}else{
		return props.icon;
	}
});

const classes = computed<string[]>(() => {
	let list =  ["button"]
	if(!props.title) list.push("noTitle");
	if(props.white !== false) list.push("white");
	if(props.red !== false) list.push("red");
	if(props.selected !== false) list.push("selected");
	if(props.loading !== false) list.push("disabled");
	if(props.disabled !== false) list.push("disabled");
	return list;
});
</script>

<style lang="less" scoped>
.button {
	position: relative;//Necessary for loader spinning absolute placement
	display: inline-flex;
	// width: 100%;
	// height: 100%;
	justify-content: center;
	align-items: center;
	flex-direction: row;
	white-space: nowrap;
	transition: all .25s;
	overflow: hidden;

	&.noTitle {
		margin: 0;
		padding: 7px;
		.icon {
			height: 100%;
			width: 100%;
			margin: 0;
			padding: 0;
		}
	}

	.icon {
		// max-height: 20px;
		width: 20px;
		margin-right: 10px;
		vertical-align: middle;
	}

	.spinner {
		.center;
		position: absolute;
		vertical-align: middle;
		height: 25px;
		width: 25px;
	}

	.label {
		flex-grow: 1;
		white-space: nowrap;
	}

	.label, .icon {
		opacity: 1;
		transition: opacity .2s;
		&.hide {
			opacity: .25;
		}
	}

	&.white {
		color: @mainColor_normal;
		background-color: #fff;
		.label, .icon {
			&.hide {
				opacity: .4;
			}
		}
		&:not(.loading):hover {
			background-color: @mainColor_light_extralight;
		}
		&.loading {
			background-color: fade(#ffffff, 50%);
		}
	}

	&.red {
		background-color: @mainColor_warn;
		.label, .icon {
			&.hide {
				opacity: .4;
			}
		}
		&:not(.loading):hover {
			background-color: @mainColor_warn_light;
		}
		&.loading {
			background-color: fade(@mainColor_warn, 50%);
		}
		&.selected {
			background-color: @mainColor_warn_extralight;
		}
	}

	&.selected:not(.red) {
		background-color: @mainColor_highlight;
		color: #fff;
		&:hover {
			background-color: fade(@mainColor_normal_light, 50%);
		}
	}
	&.small {
		padding: 5px 10px;
		border-radius: 7px;
		font-size: 14px;
		text-transform: none;
	}
	
	&.disabled {
		opacity: .5;
		color: @mainColor_normal_light;
	}
	
	&.cancel {
		background-color: #ccc;
		&:hover {
			background-color: #ddd;
		}
	}
}
</style>