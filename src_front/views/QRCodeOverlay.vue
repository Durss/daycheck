<template>
	<div class="qrcodeoverlay">
		<div class="description">Transfer this calendar to your mobile phone by scanning this QRCode</div>
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

onMounted(() => {
	let options = {
		margin:0,
		color: {
			dark:"#e7bd00",
			light:"#ffffff",
		}
	}

	let dataurl = Utils.encodeForURI(storeMain.data);
	let url = router.resolve({name:"calendar", params:{id:Utils.slugify(storeMain.data.name), dataurl:dataurl}}).href;
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