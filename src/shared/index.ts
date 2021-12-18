// 通信类，统一使用此交换数据

export interface IPC {
  takeDirectory(): Promise<any>;
  // 获取应用配置信息
  getConfig(): Promise<any>;
}
