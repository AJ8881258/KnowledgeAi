package com.knowflow.backend.settings.entity;

import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class UserPreference {
    private Long userId;
    private String language; // 用户界面语言偏好，当前只保存不做全站翻译。
    private String timezone; // 用户时区，用于今天交谈次数的日期边界。
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
