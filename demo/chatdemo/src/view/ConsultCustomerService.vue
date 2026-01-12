<script setup lang="ts">
import {
	Channel,
	ChannelTypePerson,
	type ConnectionInfo,
	ConnectStatus, Message, MessageContent,
	MessageStatus, MessageText, PullMode, type SendackPacket, Setting,
	WKSDK
} from "wukongimjssdk";
import MessageUI from "@/messages/Message.vue";
import {useRouter} from "vue-router";
import {nextTick, onMounted, onUnmounted, ref} from "vue";
import {useAppStore} from "@/store/app.ts";
import APIClient from "@/services/APIClient.ts";
import {toast} from "vue-sonner";

const router = useRouter()
const title = ref("")
const appStore = useAppStore()
const to = ref(appStore.channelInfo)
const messages = ref<Message[]>(new Array<Message>())
const text = ref("")
const chatRef = ref<HTMLElement | null>(null)
const pulldowning = ref(false) // 下拉中
const pulldownFinished = ref(false) // 下拉完成

const logout = () => {
	WKSDK.shared().connectManager.disconnect()
	router.push({ path: '/' })
}
onMounted(() => {
	// if (!APIClient.shared.config.apiURL || APIClient.shared.config.apiURL === '') {
	// 	WKSDK.shared().connectManager.disconnect()
	// 	router.push({ path: '/' })
	// }
	// // 获取IM的长连接地址
	// APIClient.shared.get('/route', {
	// 	param: { uid: router.currentRoute.value.query.uid }
	// }).then((res) => {
	// 	console.log(res)
	// 	let addr = res.wss_addr
	// 	if (!addr || addr === "") {
	// 		addr = res.ws_addr
	// 	}
	// 	connectIM('http://127.0.0.1:5200')
		connectIM('wss://keep-mind.douxiyou.com/ws')
	// }).catch((err) => {
	// 	console.log(err)
	// })
})
const handleStatusChange = (status: ConnectStatus, code?: number, connectionInfo?: ConnectionInfo) => {
	console.log('连接信息', connectionInfo)
	if (status === ConnectStatus.Connected) {
		title.value = `连接成功: ${status} || ${code}`
		return
	}
	title.value = `断开:${status} || ${code}`
}
const handleMessage = (msg: Message) => {
	if (!to.value.isEqual(msg.channel)) {
		console.log('不知道哪里来的消息', msg)
		return
	}
	messages.value.push(msg)
}
const handleMessageStatus = (ack: SendackPacket) => {
	console.log('消息状态::', ack)
	messages.value.forEach((m) => {
        if (m.clientSeq == ack.clientSeq) {
            m.status = ack.reasonCode == 1 ? MessageStatus.Normal : MessageStatus.Fail
            return
        }
    })
}
const connectIM = (addr: string) => {
	console.log("connectIM--->", addr)
	const config = WKSDK.shared().config
	config.uid = appStore.token.uuid
	config.token = appStore.token.access_token
	config.addr = addr
	config.sendCountOfEach = 100000
	WKSDK.shared().config = config
	WKSDK.shared().connectManager.addConnectStatusListener(handleStatusChange)
	WKSDK.shared().chatManager.addMessageListener(handleMessage)
	WKSDK.shared().chatManager.addMessageStatusListener(handleMessageStatus)
	WKSDK.shared().connect();
}
onUnmounted(() => {
    WKSDK.shared().connectManager.removeConnectStatusListener(handleStatusChange)
    WKSDK.shared().chatManager.removeMessageListener(handleMessage)
    WKSDK.shared().chatManager.removeMessageStatusListener(handleMessageStatus)
    WKSDK.shared().disconnect()
})
const scrollBottom = () => {
	const chat = chatRef.value
	if (chat) {
		nextTick(function () {
			chat.scrollTop = chat.scrollHeight
		})
	}
}
const handleSend = () => {
	if (!text.value || text.value.trim() === "") {
		toast.info('请输入内容')
		return
	}
	const setting = Setting.fromUint8(0)
	if (to.value && to.value.channelID != "") {
		let content: MessageContent
		content = new MessageText(text.value)
		WKSDK.shared().chatManager.send(content, to.value, setting)
		text.value = ""
	} else {
		toast.error('客服信息不完整,或者不存在')
	}
	scrollBottom()
}
const pullDown = async () => {
	if (messages.value.length == 0) {
		return
	}
	const firstMsg = messages.value[0]
	if (!firstMsg) {
		return
	}
	if (firstMsg.messageSeq == 1) {
		pulldownFinished.value = true
		return
	}
	const limit = 15
	const msgs = await WKSDK.shared().chatManager.syncMessages(to.value, {
		limit: limit, startMessageSeq: firstMsg.messageSeq - 1, endMessageSeq: 0,
		pullMode: PullMode.Down
	})
	if (msgs.length < limit) {
		pulldownFinished.value = true
	}
	if (msgs && msgs.length > 0) {
		msgs.reverse().forEach((m) => {
			messages.value.unshift(m)
		})
	}
	nextTick(() => {
		const chat = chatRef.value
		const firstMsgEl = document.getElementById(firstMsg.clientMsgNo)
		if (firstMsgEl) {
			chat!.scrollTop = firstMsgEl.offsetTop
		}
	})
}
const handleScroll = (e: any) => {
	const targetScrollTop = e.target.scrollTop;
	// const scrollOffsetTop = e.target.scrollHeight - (targetScrollTop + e.target.clientHeight);
	if (targetScrollTop <= 250) { // 下拉
		if (pulldowning.value || pulldownFinished.value) {
			console.log("不允许下拉", "pulldowning", pulldowning.value, "pulldownFinished", pulldownFinished.value)
			return
		}
		console.log("下拉")
		pulldowning.value = true
		pullDown().then(() => {
			pulldowning.value = false
		}).catch(() => {
			pulldowning.value = false
		})
	}
}
</script>

<template>
	<div class="chat">
		<div class="header">
			<div class="left">
				<button v-on:click="logout">退出</button>
				<button>聊天列表</button>
			</div>
			<div class="center">
				{{ title }}
			</div>
		</div>
		<div class="content">
			<div class="message-box">
				<div class="message-list" v-on:scroll="handleScroll" ref="chatRef">
					<template v-for="m in messages">
						<div class="message right" v-if="m.send" :id="m.clientMsgNo">
							<div class="status" v-if="m.status != MessageStatus.Normal">发送中</div>
							<div class="bubble right">
								<MessageUI :message="m"></MessageUI>
							</div>
							<div class="avatar">
								<img :src="`https://api.dicebear.com/9.x/adventurer/svg?seed=${m.fromUID}&radius=50&backgroundType=gradientLinear&backgroundColor=ffd5dc`"
								     style="width: 40px;height: 40px;" />
							</div>
						</div>
						<div class="message" v-if="!m.send" :id="m.clientMsgNo">
							<div class="avatar">
								<img :src="`https://api.dicebear.com/9.x/adventurer/svg?seed=${m.fromUID}&radius=50&backgroundType=gradientLinear&backgroundColor=ffd5dc`"
								     style="width: 40px;height: 40px;" />
							</div>
							<div class="bubble">
								<MessageUI :message="m"></MessageUI>
							</div>
						</div>
					</template>
				</div>
				<div class="footer">
					<input v-model="text" style="height: 40px;"/>
					<button v-on:click="handleSend">发送</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.chat {
	width: 100%;
	height: 100vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	position: relative;
}

.header {
	height: 60px;
	background-color: #f5f5f5;
	display: flex;
	align-items: center;
	justify-content: center;
	border-bottom: 1px;
	position: fixed;
	top: env(safe-area-inset-top);
	left: 0;
	right: 0;
	z-index: 9999;
	width: 100%;
}

@media (prefers-color-scheme: dark) {
	.header {
		background-color: #000;
	}
}

.header .left {
	display: flex;
}

.header .left button {
	margin-left: 10px;
	height: 40px;
	display: flex;
	align-items: center;
	font-size: 15px;
	background-color: transparent;
}

.header .center {
	flex: 1;
	font-size: 18px;
	font-weight: bold;
}

.header .right button {
	margin-right: 10px;
	height: 40px;
	display: flex;
	align-items: center;
	font-size: 15px;
	background-color: transparent;
	color: rgb(228, 98, 64);
}



.content {
	background-color: #f5f5f5;
	position: relative;
	display: flex;
	height: calc(100vh - 60px);
	/* header + footer */
	/* header height */
	padding-top: calc(60px + env(safe-area-inset-top));
	/* padding-top: 60px; */
	/* padding-bottom: 60px; */
	/* overflow-y: auto; */
	/* footer height */
}

@media (prefers-color-scheme: dark) {
	.content {
		background-color: #000;
	}
}

.message {
	display: flex;
	margin: 10px;
}

.message.right {
	justify-content: flex-end;
}

.message .bubble {
	background-color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 0px 10px 10px 10px;
	padding: 10px;
	color: black;
	margin-left: 10px;
}

.bubble.right {
	border-radius: 10px 0px 10px 10px;
	background-color: rgb(228, 98, 64);
	color: white;
	margin-right: 10px;
}

.message .avatar {
	width: 40px;
	height: 40px;
	background-color: green;
	border-radius: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	color: white;
}

.message .status {
	font-size: 12px;
	color: rgb(228, 98, 64);
	margin-left: 10px;
	margin-bottom: 5px;
	display: flex;
	align-items: center;
}




.footer {
	height: 60px;
	background-color: white;
	display: flex;
	bottom: env(safe-area-inset-bottom);
	width: 100%;
	align-items: center;
}

@media (prefers-color-scheme: dark) {
	.footer {
		background-color: #333;
	}
}

.footer button {
	width: 80px;
	height: 40px;
	margin: 5px;
	border: none;
	outline: none;
	background-color: rgb(228, 98, 64);
	color: white;
	font-size: 15px;
}

.footer input {
	flex: 1;
	border: none;
	outline: none;
	margin-left: 10px;
}

.setting {
	position: absolute;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 100%;
}

.setting .setting-content {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 250px;
	background-color: white;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
	padding: 20px;
	border-radius: 4px;
}

@media (prefers-color-scheme: dark) {
	.setting .setting-content {
		background-color: #333;
		color: white;
	}
}

.switch {
	display: flex;
	align-items: center;
	width: 100%;
	justify-content: center;
	margin-top: 10px;
}

.switch .item {
	margin-left: 20px;
	font-size: 14px;
}

.to {
	border: none;
	width: 100%;
	height: 40px;
	margin-top: 20px;
	box-sizing: border-box;
}

.ok {
	width: 100%;
	height: 40px;
	margin-top: 30px;
	border: none;
	outline: none;
	background-color: rgb(228, 98, 64);
	color: white;
	font-size: 15px;
	cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
	opacity: 0;
}

.message-stream {
	width: 120px !important;
	height: 40px;
}

.message-box {
	width: 100%;
	height: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.message-list {
	width: 100%;
	height: calc(100% - 60px);
	overflow: auto;
}

.conversation-box {
	display: flex;
	position: relative;
	width: 300px;
	height: 100%;
	left: 0px;
	z-index: 10000;
}

.message-custom {
	width: 120px !important;
	height: 40px;
}
</style>