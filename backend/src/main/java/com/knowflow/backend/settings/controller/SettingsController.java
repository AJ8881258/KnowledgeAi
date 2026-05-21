package com.knowflow.backend.settings.controller;


import com.knowflow.backend.settings.dto.request.UpdateRagSettingsRequest;
import com.knowflow.backend.settings.dto.response.ModelSettingsResponse;
import com.knowflow.backend.settings.dto.response.RagSettingsResponse;
import com.knowflow.backend.settings.service.SettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    /**
     * 返回后端模型环境变量配置状态。
     *
     * @return
     */
    @GetMapping("/model")
    public ModelSettingsResponse getModelSettings() {
        return settingsService.getModelSettings();
    }

    /**
     * 获取用户RAG设置
     *
     * @param jwt
     * @return
     */
    @GetMapping("/rag")
    public RagSettingsResponse getRagSettings(@AuthenticationPrincipal Jwt jwt) {
        return settingsService.getRagSettings(getCurrent(jwt));
    }


    /**
     * 更新用户RAG设置
     *
     * @param request
     * @param jwt
     * @return
     */
    @PatchMapping("/rag")
    public RagSettingsResponse updateRagSettings(@RequestBody(required = true) UpdateRagSettingsRequest request, @AuthenticationPrincipal Jwt jwt) {
        return settingsService.updateRagSettings(getCurrent(jwt), request);
    }


    private Long getCurrent(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "JWT is null");
        }
        Number userId = jwt.getClaim("userId");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "userId is null");
        }
        return userId.longValue();
    }

}
