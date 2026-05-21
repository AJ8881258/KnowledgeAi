package com.knowflow.backend.auth.dto.request;

import lombok.Data;

@Data
public class UpdateCurrentUserRequest {
    //修改邮箱请求
    private String email;
}
