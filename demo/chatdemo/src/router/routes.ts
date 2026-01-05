import type {RouteRecordRaw} from 'vue-router';

const chat = () => import('../view/Chat.vue')
const login = () => import('../view/Login.vue')
const routes: Array<RouteRecordRaw> = [
	{
		path: '/login',
		name: 'Login',
		component: login,
	},
	{
		path: '/',
		name: 'Home',
		component: () => import('../view/Home.vue'),
	},
	{
		path: '/chat',
		name: 'Chat',
		component: chat,
	},
]
export default routes;

