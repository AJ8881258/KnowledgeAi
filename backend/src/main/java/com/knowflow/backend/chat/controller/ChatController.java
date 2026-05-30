package com.knowflow.backend.chat.controller;

import java.util.List;

import com.knowflow.backend.chat.dto.request.UpdateChatSessionRequest;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.knowflow.backend.chat.dto.request.CreateChatSessionRequest;
import com.knowflow.backend.chat.dto.request.SendMessageRequest;
import com.knowflow.backend.chat.dto.response.ChatMessageResponse;
import com.knowflow.backend.chat.dto.response.ChatSessionResponse;
import com.knowflow.backend.chat.dto.response.ChatUsageTodayResponse;
import com.knowflow.backend.chat.dto.response.SendMessageResponse;
import com.knowflow.backend.chat.service.ChatService;

import static com.knowflow.backend.common.utils.AuthUtils.getCurrentUserId;

@RestController
@RequestMapping("/api")
public class ChatController {
    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/knowledge-bases/{knowledgeBaseId}/chat/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatSessionResponse createSession(
            @PathVariable Long knowledgeBaseId,
            @RequestBody(required = false) CreateChatSessionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return chatService.createSession(knowledgeBaseId, getCurrentUserId(jwt), request);
    }

    @GetMapping("/knowledge-bases/{knowledgeBaseId}/chat/sessions")
    public List<ChatSessionResponse> listSessions(
            @PathVariable Long knowledgeBaseId,
            @AuthenticationPrincipal Jwt jwt) {
        return chatService.listSessions(knowledgeBaseId, getCurrentUserId(jwt));
    }

    @GetMapping("/chat/sessions/{sessionId}/messages")
    public List<ChatMessageResponse> listMessages(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Jwt jwt) {
        return chatService.listMessages(sessionId, getCurrentUserId(jwt));
    }


    @PatchMapping("/chat/sessions/{sessionId}")
    public ChatSessionResponse updateSession(
            @PathVariable Long sessionId,
            @RequestBody UpdateChatSessionRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return chatService.updateSession(sessionId, getCurrentUserId(jwt), request);
    }

    @DeleteMapping("/chat/sessions/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        chatService.deleteSession(sessionId, getCurrentUserId(jwt));
    }


    @PostMapping("/chat/sessions/{sessionId}/messages")
    public SendMessageResponse sendMessage(
            @PathVariable Long sessionId,
            @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return chatService.sendMessage(sessionId, getCurrentUserId(jwt), request);
    }

    @PostMapping("/chat/sessions/{sessionId}/cancel")
    public ChatSessionResponse cancelGeneration(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Jwt jwt) {
        return chatService.cancelGeneration(sessionId, getCurrentUserId(jwt));
    }

    @GetMapping("/chat/usage/today")
    public ChatUsageTodayResponse getTodayUsage(
            @RequestParam(required = false) String timezone,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return chatService.getTodayUsage(getCurrentUserId(jwt), timezone);
    }
}
