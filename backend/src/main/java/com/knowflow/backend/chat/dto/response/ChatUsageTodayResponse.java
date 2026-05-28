package com.knowflow.backend.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @Desc 今日聊天使用量响应
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatUsageTodayResponse {
    private String date;
    private String timezone;
    private long messageCount;
}
