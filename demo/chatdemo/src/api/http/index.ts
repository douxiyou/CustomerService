import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CustomParamsSerializer
} from "axios";
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import { stringify } from "qs";
import {useAppStore} from "@/store/app.ts";

/** 格式化token（jwt格式） */
export const formatToken = (token: string): string => {
	return "Bearer " + token;
};

// 从环境变量或默认值获取baseURL
const getBaseURL = (): string => {
  // 检查是否有全局配置的API地址
  if (typeof window !== 'undefined' && (window as any).__CHAT_API_BASE_URL__) {
    return (window as any).__CHAT_API_BASE_URL__;
  }
  
  // 检查是否有环境变量
  if (typeof process !== 'undefined' && process.env?.VUE_APP_API_BASE_URL) {
    return process.env.VUE_APP_API_BASE_URL;
  }
  
  // 默认值
  return 'https://keep-mind.douxiyou.com';
};

// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  baseURL: getBaseURL(),
  // 请求超时时间
  timeout: 10000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

class ChatHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** `token`过期后，暂存待执行的请求 */
  private static requests = [];

  /** 防止重复刷新`token` */
  private static isRefreshing = false;

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 重连原始请求 */
  private static retryOriginalRequest(config: PureHttpRequestConfig) {
    return new Promise(resolve => {
      ChatHttp.requests.push((token: string) => {
        config.headers["Authorization"] = formatToken(token);
        resolve(config);
      });
    });
  }

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    ChatHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
	      console.log('请求参数', config)
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof config.beforeRequestCallback === "function") {
          config.beforeRequestCallback(config);
          return config;
        }
        if (ChatHttp.initConfig.beforeRequestCallback) {
          ChatHttp.initConfig.beforeRequestCallback(config);
          return config;
        }
				const appStore = useAppStore()
	      console.log('请求信息', config)
        /** 请求白名单，放置一些不需要`token`的接口（通过设置请求白名单，防止`token`过期后再请求造成的死循环问题） */
        const whiteList = ["/refresh-token", "/login", '/guest-create'];
        return whiteList.some(url => config.url.endsWith(url))
          ? config
          : new Promise(resolve => {
              const data = appStore.token;
              if (data) {
                const now = new Date().getTime() / 1000;
                const expired = data.expires_in - now / 1000 <= 0;
                if (expired) {
                  if (!ChatHttp.isRefreshing) {
                    ChatHttp.isRefreshing = true;
                    // token过期刷新
                    appStore
                      .handRefreshToken()
                      .then(res => {
                        const token = res.access_token;
                        config.headers["Authorization"] = formatToken(token);
                        ChatHttp.requests.forEach(cb => cb(token));
                        ChatHttp.requests = [];
                      })
                      .finally(() => {
                        ChatHttp.isRefreshing = false;
                      });
                  }
                  resolve(ChatHttp.retryOriginalRequest(config));
                } else {
                  config.headers["Authorization"] = formatToken(
                    data.access_token
                  );
                  resolve(config);
                }
              } else {
                resolve(config);
              }
            });
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = ChatHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const $config = response.config;
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          return response.data;
        }
        if (ChatHttp.initConfig.beforeResponseCallback) {
          ChatHttp.initConfig.beforeResponseCallback(response);
          return response.data;
        }
        return response.data;
      },
      (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);
        // 所有的响应异常 区分来源为取消请求/非取消请求
        return Promise.reject($error);
      }
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    // 单独处理自定义请求/响应回调
    return new Promise((resolve, reject) => {
      ChatHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response.data);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /** 单独抽离的`post`工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  /** 单独抽离的`get`工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }

  // 添加一个方法用于动态更新baseURL
  public setBaseURL(baseURL: string): void {
    ChatHttp.axiosInstance.defaults.baseURL = baseURL;
  }
}

export const chatHttp = new ChatHttp();
