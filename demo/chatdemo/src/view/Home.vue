<template>
  <div>
    <div :class="appStore.token.access_token !== '' ? 'bg-green-500' : 'bg-red-500'">Guest 用户</div>
    <Button variant="outline" @click="handleGuestLogin">登录/创建 Guest 用户</Button>
    <Button variant="outline" @click="handleLoginIM">登录IM</Button>
	  <div>客服: {{customer}}</div>
	  <Button variant="outline" @click="handleCustomer">请求客服</Button>
  </div>
</template>
<script setup lang="ts">
import {Button} from '@/components/ui/button';
import {useAppStore} from "@/store/app.ts";
import {ref} from "vue";
import {useRouter} from "vue-router";
import {toast} from "vue-sonner";
const appStore = useAppStore();
const customer = ref("")
const router = useRouter()
const handleGuestLogin = () => {
  console.log("handleGuestLogin")
	appStore.login()
}
const handleLoginIM = () => {
	appStore.loginIM().then((res) => {
		console.log(res)
		toast.success("登录IM成功")
	}).catch((err) => {
		console.log(err)
		toast.error(err.msg)
	})
}
const handleCustomer = () => {
	appStore.handleRequestCustomer().then((res) => {
		console.log('创建频道的结果', res)
		router.push({name: 'ConsultCustomerService'})
	})
}

</script>