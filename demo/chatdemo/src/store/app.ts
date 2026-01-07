import {defineStore} from "pinia";
import {ref} from "vue";
import {guestApi, loginIMApi, refreshTokenApi, requestCustomerServiceApi} from "@/api/app.ts";
import {toast} from "vue-sonner";
import {Channel} from "wukongimjssdk";

export interface TokenInterface {
	uuid : string
	access_token: string
	refresh_token: string
	expires_in: number
}

export const useAppStore = defineStore('app', () => {
	const token = ref<TokenInterface>({
		uuid: '',
		access_token: '',
		refresh_token: '',
		expires_in: 0,
	})
	const channelInfo = ref<Channel>()
	const imLogined = ref(false)
	const loginIM = () => {
		return new Promise((resolve, reject) => {
			loginIMApi().then(res => {
				console.log( '登录IM成功', res)
				imLogined.value = true
				resolve(true)
			}).catch( err => {
				console.log('登录IM失败', err)
				toast.error(err.msg)
				reject(err)
			})
		})
	}
	const login = () => {
		guestApi('customer-service-user').then(res => {
			console.log('登录', res)
			token.value = res
		}).catch(err => {
			console.log('登录失败', err)
			toast.error(err.msg)
		})
	}
	const handRefreshToken = (): Promise<TokenInterface> => {
		return new Promise( (resolve, reject) => {
			refreshTokenApi(token.value.refresh_token).then(res => {
				token.value = res
				resolve(res)
			}).catch(err => {
				console.log('刷新token失败', err)
				toast.error(err.msg)
				reject(err)
			})
		})
	}
	const handleRequestCustomer = () => {
		return new Promise((resolve, reject) => {
			requestCustomerServiceApi().then(res => {
				console.log(res)
				const {channel_id, channel_type, status} = res
				resolve(status)
				channelInfo.value =  new Channel(channel_id, channel_type)
			}).catch(err => {
				toast.error(err)
				reject(err)
			})
		})
	}
	return {
		token,
		login,
		loginIM,
		channelInfo,
		handRefreshToken,
		handleRequestCustomer,
	}
}, {
	persist: {
		key : 'app',
	}
})