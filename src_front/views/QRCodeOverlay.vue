<template>
	<div class="qrcodeoverlay">
		<div class="description">Transfer this calendar to your mobile phone by scanning this QRCode</div>
		<img :src="imageUrl" v-if="imageUrl" class="image">
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import QRCode from 'qrcode';

@Component({
	components:{}
})
export default class QRCodeOverlay extends Vue {

	private imageUrl:string = null;

	public mounted():void {
		let options = {
			margin:0,
			color: {
				dark:"#e7bd00",
				light:"#ffffff",
			}
		}
		QRCode.toDataURL(document.location.href, options).then(url => {
			this.imageUrl = url;
		})
	}

	public beforeDestroy():void {
		
	}

}
</script>

<style scoped lang="less">
@import (reference) '../less/_includes.less';
.qrcodeoverlay{
	padding: 20px;
	background: #fff;
	box-sizing: border-box;
	border-bottom-left-radius: 10px;
	border-bottom-right-radius: 10px;

	.image {
		margin: auto;
		display: block;
	}

	.description {
		font-family: "FuturaLight";
		text-align: center;
		margin-bottom: 20px;
	}
}
</style>