package com.knowflow.backend.chat.dto.request;

import lombok.Data;

@Data
public class UpdateChatSessionRequest {
    private String title;
    private Boolean pinned;
}
