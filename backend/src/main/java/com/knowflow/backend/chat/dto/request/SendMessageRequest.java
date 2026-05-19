package com.knowflow.backend.chat.dto.request;


import lombok.Data;

/**
 * @class 发送消息请求实体
 * @content 消息内容
 * @limit 限制引用来源数量
 */

@Data
public class SendMessageRequest {
    private String content;
    private Integer limit;
}
