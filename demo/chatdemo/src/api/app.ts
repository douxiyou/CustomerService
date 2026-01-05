import {chatHttp} from "@/api/http";
import type {TokenInterface} from "@/store/app.ts";

export function guestApi(deviceId: string) {
	return chatHttp.post<TokenInterface, undefined>('/api/v1/user/guest-create', undefined, {
		headers: {
			'X-Device-Id': deviceId
		}
	})
}
export function refreshTokenApi(token: string) {
	return chatHttp.post<TokenInterface, {refreshToken: string}>('/api/v1/user/refresh-token', {data:{ refreshToken: token }})
}
export function requestCustomerServiceApi() {
	return chatHttp.post<{channel_id: string, status: string}, undefined>('/api/v1/im-service/create-session')
}
export function loginIMApi() {
	return chatHttp.post<{channel_id: string, status: string}, undefined>('/api/v1/im-service/login-im')
}