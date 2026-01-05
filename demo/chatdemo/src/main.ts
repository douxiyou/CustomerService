import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import router from './router/index'
import { initDataSource } from './services/datasource'

import {orderMessage,CustomMessage}  from "./customessage"
import WKSDK from 'wukongimjssdk'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 注册自定义消息
WKSDK.shared().register(orderMessage,()=>new CustomMessage());

const appVue = createApp(App)
appVue.use(router)
appVue.use(pinia)
appVue.mount('#app')

initDataSource()


