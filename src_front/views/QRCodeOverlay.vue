<template>
	<div class="qrcodeoverlay">
		<div class="description">Transfer this calendar to your mobile phone by scanning this QRCode</div>
		<img :src="imageUrl" v-if="imageUrl" class="image">
	</div>
</template>

<script lang="ts">
import { Component, Inject, Model, Prop, Vue, Watch, Provide } from "vue-property-decorator";
import QRCode from 'qrcode';
import Utils from '../utils/Utils';

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
		
		let dataurl = Utils.encodeForURI(this.$store.state.data);
		let url = this.$router.resolve({name:"calendar", params:{id:Utils.slugify(this.$store.state.data.name), dataurl:dataurl}}).href;
		url = document.location.protocol+"//"+document.location.host+url;
		QRCode.toDataURL(url, options).then(url => {
			this.imageUrl = url;
		})
	}

	public beforeDestroy():void {
		
	}

}
</script>

<style scoped lang="less">
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