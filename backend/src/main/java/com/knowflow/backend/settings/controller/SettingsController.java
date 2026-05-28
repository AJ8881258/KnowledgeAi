package com.knowflow.backend.settings.controller;


import com.knowflow.backend.settings.dto.request.FetchModelListRequest;
import com.knowflow.backend.settings.dto.request.TestModelConnectionRequest;
import com.knowflow.backend.settings.dto.request.UpdateModelSettingsRequest;
import com.knowflow.backend.settings.dto.request.UpdateRagSettingsRequest;
import com.knowflow.backend.settings.dto.request.UpdateUserPreferenceRequest;
import com.knowflow.backend.settings.dto.response.ModelConnectionTestResponse;
import com.knowflow.backend.settings.dto.response.ModelListResponse;
import com.knowflow.backend.settings.dto.response.ModelSettingsResponse;
import com.knowflow.backend.settings.dto.response.RagSettingsResponse;
import com.knowflow.backend.settings.dto.response.UserPreferenceResponse;
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

    @GetMapping("/model")
    public ModelSettingsResponse getModelSettings(@AuthenticationPrincipal Jwt jwt) {
        return settingsService.getModelSettings(getCurrent(jwt));
    }

    @PatchMapping("/model")
    public ModelSettingsResponse updateModelSettings(@RequestBody UpdateModelSettingsRequest request, @AuthenticationPrincipal Jwt jwt) {
        return settingsService.updateModelSettings(getCurrent(jwt), request);
    }

    @PostMapping("/model/models")
    public ModelListResponse fetchModels(@RequestBody FetchModelListRequest request, @AuthenticationPrincipal Jwt jwt) {
        return settingsService.fetchModels(getCurrent(jwt), request);
    }

    /**
     * @param request 可选测试参数；为空字段会复用当前用户已保存的 Base URL/API Key/Model
     * @param jwt     当前登录用户，后端只会读取该用户自己的模型配置
     * @return chat completions 连接测试结果，失败时返回脱敏错误
     * @Desc Settings 保存配置后用本接口验证真实聊天链路，不再只依赖“配置已保存”判断模型是否可用。
     */
    @PostMapping("/model/test")
    public ModelConnectionTestResponse testModelConnection(@RequestBody(required = false) TestModelConnectionRequest request,
                                                           @AuthenticationPrincipal Jwt jwt) {
        return settingsService.testModelConnection(getCurrent(jwt), request);
    }

    @GetMapping("/preferences")
    public UserPreferenceResponse getPreferences(@AuthenticationPrincipal Jwt jwt) {
        return settingsService.getPreferences(getCurrent(jwt));
    }

    @PatchMapping("/preferences")
    public UserPreferenceResponse updatePreferences(@RequestBody UpdateUserPreferenceRequest request, @AuthenticationPrincipal Jwt jwt) {
        return settingsService.updatePreferences(getCurrent(jwt), request);
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
