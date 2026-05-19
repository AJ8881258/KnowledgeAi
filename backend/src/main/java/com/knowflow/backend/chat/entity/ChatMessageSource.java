package com.knowflow.backend.chat.entity;


import lombok.Data;

import java.time.OffsetDateTime;

/**
 * @class 引用来源实体
 * @messageId 聊天消息ID
 * @content 命中的chunk内容
 * @description 对应chat_message_sources表
 */

@Data
public class ChatMessageSource {
    private Long id;
    private Long messageId;
    private Long documentId;
    private String documentName;
    private Long chunkId;
    private Integer chunkIndex;
    private String content;
    private Double score;
    private OffsetDateTime createdAt;
}
