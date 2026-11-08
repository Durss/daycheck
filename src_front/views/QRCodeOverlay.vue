<template>
	<div class="qrcodeoverlay">
		<div class="description" v-if="!imageUrl">Preparing QR code...</div>
		<div class="description" v-else-if="shared">Scan this QR code to open this calendar on your phone.<br>Both devices will stay in sync.</div>
		<div class="description" v-else>Server unreachable, scanning this QR code will create a copy of this calendar on your phone.</div>
		<img :src="imageUrl" v-if="imageUrl" class="image">
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import QRCode from 'qrcode';
import Utils from '../utils/Utils';
import { storeMain as useStoreMain } from '@/store/main/storeMain';

const storeMain = useStoreMain();
const router = useRouter();

const imageUrl = ref<string>(null);
const shared = ref<boolean>(false);

onMounted(async () => {
	let options = {
		margin:0,
		color: {
			dark:"#e7bd00",
			light:"#ffffff",
		}
	}

	//Make sure the server has the latest version so the calendar can be opened from another device
	shared.value = await storeMain.push(storeMain.data.id);
	let url:string;
	if(shared.value) {
		url = router.resolve({name:"calendar", params:{id:storeMain.data.id}}).href;
	}else{
		//Fallback: embed a copy of the calendar in the URL
		let dataurl = Utils.encodeForURI(storeMain.data);
		url = router.resolve({name:"calendar", params:{id:Utils.slugify(storeMain.data.name), dataurl:dataurl}}).href;
	}
	url = document.location.protocol+"//"+document.location.host+url;
	QRCode.toDataURL(url, options).then(url => {
		imageUrl.value = url;
	})
});
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