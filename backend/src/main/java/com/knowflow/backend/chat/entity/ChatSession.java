package com.knowflow.backend.chat.entity;

import lombok.Data;

import java.time.OffsetDateTime;

// 聊天会话实体类

/**
 * @class 聊天会话实体
 * @userId 用户ID
 * @knowledgeBaseId 知识库ID
 * @description 用到knowledgeBaseId和userId是因为校验用户是否有权限访问该知识库和用户
 */

@Data
public class ChatSession {
    private Long id;
    private String title;
    private Long knowledgeBaseId;// 知识库ID
    private Long userId;// 用户ID
    private Boolean pinned; //是否置顶
    private Boolean unread; // 是否未读，用于后台回答完成后的会话提醒
    private String status; // 当前会话生成状态：IDLE、GENERATING、FAILED
    private String lastErrorMessage; // 最近一次生成失败的脱敏错误信息
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
