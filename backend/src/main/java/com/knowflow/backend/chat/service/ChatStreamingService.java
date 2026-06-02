package com.knowflow.backend.chat.service;

import com.knowflow.backend.chat.dto.request.SendMessageRequest;
import com.knowflow.backend.chat.dto.response.ChatMessageResponse;
import com.knowflow.backend.chat.dto.response.ChatSessionResponse;
import com.knowflow.backend.chat.dto.response.ChatSourceResponse;
import com.knowflow.backend.chat.dto.response.ChatStreamDeltaResponse;
import com.knowflow.backend.chat.dto.response.ChatStreamDoneResponse;
import com.knowflow.backend.chat.dto.response.ChatStreamErrorResponse;
import com.knowflow.backend.chat.entity.ChatMessage;
import com.knowflow.backend.chat.entity.ChatMessageSource;
import com.knowflow.backend.chat.entity.ChatSession;
import com.knowflow.backend.chat.model.ChatModelClient;
import com.knowflow.backend.chat.model.PromptBuilder;
import com.knowflow.backend.chat.repository.ChatMessageRepository;
import com.knowflow.backend.chat.repository.ChatMessageSourceRepository;
import com.knowflow.backend.chat.repository.ChatSessionRepository;
import com.knowflow.backend.document.dto.response.SearchResultResponse;
import com.knowflow.backend.knowledgebase.service.KnowledgeBaseAccessService;
import com.knowflow.backend.settings.entity.UserRagSettings;
import com.knowflow.backend.settings.service.SettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import static com.knowflow.backend.common.model.ModelProviderErrors.safeMessage;

@Service
public class ChatStreamingService {
    private static final long SSE_TIMEOUT_MS = 10 * 60 * 1000L;
    private static final int DEFAULT_LIMIT = 5;
    private static final int MAX_LIMIT = 20;

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageSourceRepository chatMessageSourceRepository;
    private final KnowledgeBaseAccessService accessService;
    private final SettingsService settingsService;
    private final ChatDocumentContextService chatDocumentContextService;
    private final PromptBuilder promptBuilder;
    private final ChatModelClient chatModelClient;
    private final ChatService chatService;
    private final TransactionTemplate transactionTemplate;

    public ChatStreamingService(
            ChatSessionRepository chatSessionRepository,
            ChatMessageRepository chatMessageRepository,
            ChatMessageSourceRepository chatMessageSourceRepository,
            KnowledgeBaseAccessService accessService,
            SettingsService settingsService,
            ChatDocumentContextService chatDocumentContextService,
            PromptBuilder promptBuilder,
            ChatModelClient chatModelClient,
            ChatService chatService,
            PlatformTransactionManager transactionManager) {
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatMessageSourceRepository = chatMessageSourceRepository;
        this.accessService = accessService;
        this.settingsService = settingsService;
        this.chatDocumentContextService = chatDocumentContextService;
        this.promptBuilder = promptBuilder;
        this.chatModelClient = chatModelClient;
        this.chatService = chatService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * @param sessionId Chat session ID
     * @param userId 当前 JWT 用户 ID
     * @param request 用户本轮发送请求
     * @return SSE emitter，事件包括 session、user_message、assistant_message、delta、sources、done、error
     * @Desc 阶段 21 流式接口采用 POST + SseEmitter。它和非流式接口共用权限、RAG、模型配置和 activeGenerationId，
     * 但会在模型 delta 到达时持续更新同一条 ASSISTANT 消息，刷新页面可恢复已生成内容。
     */
    public SseEmitter streamMessage(Long sessionId, Long userId, SendMessageRequest request) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        ChatSession session = getSessionOr404(sessionId, userId);
        accessService.requireMember(session.getKnowledgeBaseId(), userId);
        String question = normalizeContent(request == null ? null : request.getContent());
        String requestedModel = normalizeOptionalModel(request == null ? null : request.getModel());
        boolean ragEnabled = request == null || request.getRagEnabled() == null || request.getRagEnabled();
        int requestedLimit = normalizeLimit(request == null ? null : request.getLimit());
        if (requestedModel != null && settingsService.hasCompleteUserModelSettings(userId)) {
            settingsService.updateCurrentModelFromChat(userId, requestedModel);
        }
        List<ChatMessage> historyMessages = chatService.loadPromptHistoryForStreaming(session, userId);
        String generationId = UUID.randomUUID().toString();

        ChatMessage userMessage = transactionTemplate.execute(status -> {
            ChatMessage message = new ChatMessage();
            message.setSessionId(session.getId());
            message.setRole("USER");
            message.setContent(question);
            chatMessageRepository.insert(message);
            chatSessionRepository.beginGeneration(session.getId(), userId, generationId);
            return message;
        });

        send(emitter, "user_message", new ChatMessageResponse(userMessage, List.of()));
        send(emitter, "session", new ChatSessionResponse(getSessionOr404(session.getId(), userId)));

        Thread streamThread = new Thread(
                () -> runStream(emitter, session, userId, question, historyMessages, requestedModel, ragEnabled,
                        requestedLimit,
                        request == null ? null : request.getMentionedDocumentIds(), generationId),
                "knowflow-chat-stream-" + sessionId
        );
        streamThread.start();
        emitter.onCompletion(() -> cancelIfStillGenerating(sessionId, userId, generationId));
        emitter.onTimeout(() -> cancelIfStillGenerating(sessionId, userId, generationId));
        emitter.onError(error -> cancelIfStillGenerating(sessionId, userId, generationId));
        return emitter;
    }

    private void runStream(
            SseEmitter emitter,
            ChatSession session,
            Long userId,
            String question,
            List<ChatMessage> historyMessages,
            String requestedModel,
            boolean ragEnabled,
            int requestedLimit,
            List<Long> mentionedDocumentIds,
            String generationId
    ) {
        try {
            UserRagSettings ragSettings = settingsService.getEffectiveRagSettings(userId);
            List<SearchResultResponse> retrievedChunks = ragEnabled
                    ? chatDocumentContextService.resolveContextChunks(
                    session.getKnowledgeBaseId(),
                    userId,
                    question,
                    mentionedDocumentIds,
                    requestedLimit
            )
                    : List.of();
            List<SearchResultResponse> contextChunks = limitContextChunks(
                    retrievedChunks,
                    Math.min(requestedLimit, ragSettings.getMaxContextChunks())
            );
            String prompt = contextChunks.isEmpty()
                    ? promptBuilder.buildWithoutSources(question, historyMessages)
                    : promptBuilder.build(question, contextChunks, historyMessages);
            StreamingAccumulator accumulator = new StreamingAccumulator(emitter, session.getId(), userId, generationId);
            chatModelClient.stream(userId, prompt, ragSettings.getTemperature(), requestedModel, accumulator::append);
            ChatMessageResponse finalMessage = accumulator.finish(contextChunks);
            ChatSessionResponse finalSession = new ChatSessionResponse(getSessionOr404(session.getId(), userId));
            send(emitter, "sources", finalMessage.getSources());
            send(emitter, "done", new ChatStreamDoneResponse(finalMessage, finalSession));
            emitter.complete();
        } catch (RuntimeException exception) {
            String safeMessage = safeMessage(exception);
            transactionTemplate.executeWithoutResult(status ->
                    chatSessionRepository.finishGeneration(session.getId(), userId, generationId, "FAILED", safeMessage, true)
            );
            send(emitter, "error", new ChatStreamErrorResponse(safeMessage));
            emitter.complete();
        }
    }

    private final class StreamingAccumulator {
        private final SseEmitter emitter;
        private final Long sessionId;
        private final Long userId;
        private final String generationId;
        private final StringBuilder content = new StringBuilder();
        private ChatMessage assistantMessage;

        private StreamingAccumulator(SseEmitter emitter, Long sessionId, Long userId, String generationId) {
            this.emitter = emitter;
            this.sessionId = sessionId;
            this.userId = userId;
            this.generationId = generationId;
        }

        private void append(String delta) {
            if (delta == null || delta.isEmpty()) {
                return;
            }
            if (!chatSessionRepository.isActiveGeneration(sessionId, userId, generationId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Generation canceled");
            }
            content.append(delta);
            ChatMessage savedMessage = transactionTemplate.execute(status -> {
                if (!chatSessionRepository.isActiveGeneration(sessionId, userId, generationId)) {
                    return null;
                }
                ChatMessage message = ensureAssistantMessage();
                chatMessageRepository.updateAssistantContent(message.getId(), sessionId, content.toString());
                return message;
            });
            if (savedMessage == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Generation canceled");
            }
            send(emitter, "delta", new ChatStreamDeltaResponse(savedMessage.getId(), delta, content.toString()));
        }

        private ChatMessage ensureAssistantMessage() {
            if (assistantMessage != null) {
                return assistantMessage;
            }
            ChatMessage message = new ChatMessage();
            message.setSessionId(sessionId);
            message.setRole("ASSISTANT");
            message.setContent("");
            message.setGenerationId(generationId);
            // 流式 partial 绑定当前 generationId，用户主动打断时只删除本次未完成助手回答，不影响历史回答。
            chatMessageRepository.insertStreamingAssistant(message);
            assistantMessage = message;
            send(emitter, "assistant_message", new ChatMessageResponse(message, List.of()));
            return message;
        }

        private ChatMessageResponse finish(List<SearchResultResponse> contextChunks) {
            ChatMessage message = transactionTemplate.execute(status -> {
                int updated = chatSessionRepository.finishGeneration(sessionId, userId, generationId, "IDLE", null, true);
                if (updated == 0) {
                    return null;
                }
                ChatMessage savedMessage = ensureAssistantMessage();
                if (!contextChunks.isEmpty()) {
                    saveSources(savedMessage.getId(), contextChunks);
                }
                return savedMessage;
            });
            if (message == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Generation canceled");
            }
            List<ChatSourceResponse> sources = chatMessageSourceRepository.findAllByMessageId(message.getId())
                    .stream()
                    .map(ChatSourceResponse::new)
                    .toList();
            message.setContent(content.toString());
            return new ChatMessageResponse(message, sources);
        }
    }

    private void cancelIfStillGenerating(Long sessionId, Long userId, String generationId) {
        if (chatSessionRepository.isActiveGeneration(sessionId, userId, generationId)) {
            // 连接异常/刷新/超时只释放生成状态，不删除 partial。
            // 这样页面刷新后仍可恢复已生成内容；只有用户显式调用 cancel 接口才清理本次 ASSISTANT partial。
            chatSessionRepository.clearGenerationIfActive(sessionId, userId, generationId);
        }
    }

    private ChatSession getSessionOr404(Long sessionId, Long userId) {
        return chatSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat session not found"));
    }

    private String normalizeContent(String content) {
        if (content == null || content.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is empty");
        }
        return content.trim();
    }

    private String normalizeOptionalModel(String model) {
        if (model == null || model.trim().isBlank()) {
            return null;
        }
        return model.trim();
    }

    /**
     * @param limit 请求体中的候选 chunk 数量限制；为空时采用旧接口默认值 5。
     * @return 1 到 20 之间的安全 limit
     * @Desc 流式接口与非流式接口保持相同 limit 语义，避免前端传入 limit 后只在非流式路径生效。
     */
    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        if (limit < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "limit must be >= 1");
        }
        return Math.min(limit, MAX_LIMIT);
    }

    private List<SearchResultResponse> limitContextChunks(List<SearchResultResponse> chunks, int maxContextChunks) {
        if (chunks.size() <= maxContextChunks) {
            return chunks;
        }
        return chunks.stream().limit(maxContextChunks).toList();
    }

    private void saveSources(Long messageId, List<SearchResultResponse> chunks) {
        for (SearchResultResponse chunk : chunks) {
            ChatMessageSource source = new ChatMessageSource();
            source.setMessageId(messageId);
            source.setDocumentId(chunk.getDocumentId());
            source.setDocumentName(chunk.getDocumentName());
            source.setChunkId(chunk.getChunkId());
            source.setChunkIndex(chunk.getChunkIndex());
            source.setContent(chunk.getContent());
            source.setScore(chunk.getScore());
            source.setHybridScore(chunk.getHybridScore());
            source.setFulltextScore(chunk.getFulltextScore());
            source.setSemanticScore(chunk.getSemanticScore());
            source.setRetrievalMode(chunk.getRetrievalMode());
            chatMessageSourceRepository.insert(source);
        }
    }

    private void send(SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SSE connection closed");
        }
    }
}
