// 定义所有可能的消息类型
export type MessageType = 
  | 'GET_SUMMARY'
  | 'UPDATE_SUMMARY'
  | 'REQUEST_TRANSCRIPT'
  | 'TRANSCRIPT_READY'
  | 'ERROR';

// 消息接口
export interface Message {
  type: MessageType;
  payload?: any;
  tabId?: number;
  error?: string;
}

// 摘要相关的消息payload类型
export interface SummaryPayload {
  videoId: string;
  summary?: string;
  transcript?: string;
  title?: string;
  language?: string;
}

// 错误消息payload类型
export interface ErrorPayload {
  code: string;
  message: string;
  details?: any;
}
