package com.knowflow.backend.chat.service;

import com.knowflow.backend.chat.dto.request.CreateChatSessionRequest;
import com.knowflow.backend.chat.dto.request.SendMessageRequest;
import com.knowflow.backend.chat.dto.request.UpdateChatSessionRequest;
import com.knowflow.backend.chat.dto.response.ChatMessageResponse;
import com.knowflow.backend.chat.dto.response.ChatSessionResponse;
import com.knowflow.backend.chat.dto.response.ChatSourceResponse;
import com.knowflow.backend.chat.dto.response.SendMessageResponse;
import com.knowflow.backend.chat.entity.ChatMessage;
import com.knowflow.backend.chat.entity.ChatMessageSource;
import com.knowflow.backend.chat.entity.ChatSession;
import com.knowflow.backend.chat.model.ChatModelClient;
import com.knowflow.backend.chat.model.PromptBuilder;
import com.knowflow.backend.chat.repository.ChatMessageRepository;
import com.knowflow.backend.chat.repository.ChatMessageSourceRepository;
import com.knowflow.backend.chat.repository.ChatSessionRepository;
import com.knowflow.backend.document.repository.DocumentChunkRepository;
import com.knowflow.backend.document.dto.response.SearchResultResponse;
import com.knowflow.backend.knowledgebase.service.KnowledgeBaseAccessService;
import com.knowflow.backend.settings.entity.UserRagSettings;
import com.knowflow.backend.settings.service.SettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
public class ChatService {
    private static final int DEFAULT_LIMIT = 5;
    private static final int MAX_LIMIT = 20;
    private static final int MAX_HISTORY_MESSAGES = 6;
    private static final int MAX_HISTORY_TOTAL_CHARS = 3000;
    private static final int MAX_HISTORY_SINGLE_MESSAGE_CHARS = 800;
    private static final String EMPTY_RETRIEVAL_FALLBACK_MESSAGE =
            "当前知识库中没有检索到足够相关的资料，请换个问法或上传更多文档。";

    private final KnowledgeBaseAccessService accessService;
    private final DocumentChunkRepository documentChunkRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageSourceRepository chatMessageSourceRepository;
    private final PromptBuilder promptBuilder;
    private final ChatModelClient chatModelClient;

    private final SettingsService settingsService;

    public ChatService(KnowledgeBaseAccessService accessService, DocumentChunkRepository documentChunkRepository, ChatSessionRepository chatSessionRepository, ChatMessageRepository chatMessageRepository, ChatMessageSourceRepository chatMessageSourceRepository, PromptBuilder promptBuilder, ChatModelClient chatModelClient, SettingsService settingsService) {
        this.accessService = accessService;
        this.documentChunkRepository = documentChunkRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatMessageSourceRepository = chatMessageSourceRepository;
        this.promptBuilder = promptBuilder;
        this.chatModelClient = chatModelClient;
        this.settingsService = settingsService;
    }

    /**
     * @Class 创建会话
     * @流程：（数据库ID-用户id-数据[可无]）-> 判断用户是否有权限
     */

    @Transactional
    public ChatSessionResponse createSession(
            Long knowledgeBaseId,
            Long userId,
            CreateChatSessionRequest request) {
        // Stage 12: shared KB members can create their own sessions, but sessions remain per current user.
        accessService.requireMember(knowledgeBaseId, userId);

        String title = normalizeTitle(request == null ? null : request.getTitle());

        /**
         * @Entity ChatSession
         * @feature String title;
         * @feature Long knowledgeBaseId;// 知识库ID
         * @feature Long userId;// 用户ID
         */
        ChatSession session = new ChatSession();
        session.setKnowledgeBaseId(knowledgeBaseId);
        session.setUserId(userId);
        session.setTitle(title);

        int insertedRows = chatSessionRepository.insert(session);
        if (insertedRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Create chat session failed");
        }


        //由于 @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
        //后续会SQL 会重新setId回Entity
        ChatSession savedSession = getSessionOr404(session.getId(), userId);
        return new ChatSessionResponse(savedSession);
    }

    /**
     *
     * @param knowledgeBaseId
     * @param userId
     * @return
     * @列出所有会话
     */
    public List<ChatSessionResponse> listSessions(Long knowledgeBaseId, Long userId) {
        // Stage 12: first check KB membership, then list only this user's sessions.
        accessService.requireMember(knowledgeBaseId, userId);

        return chatSessionRepository.findAllByKnowledgeBaseIdAndUserId(knowledgeBaseId, userId)
                .stream()
                .map(ChatSessionResponse::new)
                .toList();
    }

    /**
     * @param sessionId
     * @param userId
     * @return
     * @Des 列出消息
     */
    public List<ChatMessageResponse> listMessages(Long sessionId, Long userId) {
        ChatSession session = getSessionOr404(sessionId, userId);
        // Stage 12: a user-owned session is usable only while the user is still a member of its KB.
        accessService.requireMember(session.getKnowledgeBaseId(), userId);

        return chatMessageRepository.findAllBySessionIdAndUserId(sessionId, userId)
                .stream()
                .map(message -> {
                    List<ChatSourceResponse> sources = chatMessageSourceRepository
                            .findAllByMessageId(message.getId())
                            .stream()
                            .map(ChatSourceResponse::new)
                            .toList();

                    return new ChatMessageResponse(message, sources);
                })
                .toList();
    }

    /**
     * @param sessionId
     * @param userId
     * @param request
     * @return
     * @Des 更新会话
     */
    @Transactional
    public ChatSessionResponse updateSession(Long sessionId, Long userId, UpdateChatSessionRequest request) {
        ChatSession session = getSessionOr404(sessionId, userId);

        String title = request == null ? null : request.getTitle();
        Boolean pinned = request == null ? null : request.getPinned();

        if (title == null && pinned == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No session field to update");
        }

        /**
         * @Des 判断title为空或超出
         */
        String normalizedTitle = null;
        if (title != null) {
            normalizedTitle = title.trim();
            if (normalizedTitle.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is empty");
            }
            if (normalizedTitle.length() > 200) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is too long");
            }
        }
        int updatedRows = chatSessionRepository.updateByIdAndUserId(
                session.getId(),
                userId,
                normalizedTitle,
                pinned
        );
        if (updatedRows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat Session not found");
        }
        return new ChatSessionResponse(getSessionOr404(session.getId(), userId));
    }


    /**
     * @param sessionId
     * @param userId
     * @Des 删除会话
     */
    @Transactional
    public void deleteSession(Long sessionId, Long userId) {
        getSessionOr404(sessionId, userId);

        int deletedRows = chatSessionRepository.deleteByIdAndUserId(sessionId, userId);
        if (deletedRows != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat Session not found");
        }
    }

    /**
     * @param sessionId
     * @param userId
     * @param request
     * @return
     * @des 发送信息
     */

    @Transactional
    public SendMessageResponse sendMessage(Long sessionId, Long userId, SendMessageRequest request) {
        ChatSession session = getSessionOr404(sessionId, userId);
        // Stage 12: membership can be revoked after session creation, so re-check before retrieval/model work.
        accessService.requireMember(session.getKnowledgeBaseId(), userId);
        String question = normalizeContent(request == null ? null : request.getContent());
        UserRagSettings ragSettings = settingsService.getEffectiveRagSettings(userId);

        List<ChatMessage> historyMessages = loadPromptHistory(session, userId);

        ChatMessage userMessage = new ChatMessage();
        userMessage.setSessionId(session.getId());
        userMessage.setRole("USER");
        userMessage.setContent(question);
        chatMessageRepository.insert(userMessage);


        /**
         * @Des 搜索文档片段
         */
        List<SearchResultResponse> retrievedChunks = documentChunkRepository.searchIndexedChunks(
                session.getKnowledgeBaseId(),
                userId,
                question,
                ragSettings.getTopK());

        List<SearchResultResponse> contextChunks = limitContextChunks(
                retrievedChunks,
                ragSettings.getMaxContextChunks()
        );

        if (contextChunks.isEmpty()) {
            ChatMessage assistantMessage = new ChatMessage();
            assistantMessage.setSessionId(session.getId());
            assistantMessage.setRole("ASSISTANT");
            assistantMessage.setContent(EMPTY_RETRIEVAL_FALLBACK_MESSAGE);
            chatMessageRepository.insert(assistantMessage);

            chatSessionRepository.touch(session.getId(), userId);
            return new SendMessageResponse(new ChatMessageResponse(assistantMessage, List.of()));
        }

        //
        String prompt = promptBuilder.build(question, contextChunks, historyMessages);

        String answer;
        try {
            answer = chatModelClient.chat(prompt, ragSettings.getTemperature());
        } catch (IllegalStateException exception) {
            // 不把 API key、请求头或模型供应商的原始敏感错误暴露给前端。
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "AI model call failed");
        }

        //Entity
        ChatMessage assistantMessage = new ChatMessage();
        assistantMessage.setSessionId(session.getId());
        assistantMessage.setRole("ASSISTANT");
        assistantMessage.setContent(answer);
        chatMessageRepository.insert(assistantMessage);

        List<ChatSourceResponse> sources = saveSources(assistantMessage.getId(), contextChunks);
        chatSessionRepository.touch(session.getId(), userId);

        // 事务边界：一次问答里的用户消息、助手消息、引用来源一起写入，避免只保存一半数据。
        return new SendMessageResponse(new ChatMessageResponse(assistantMessage, sources));
    }


    /**
     * @param sessionId
     * @param userId
     * @return
     * @Desc 判断有没有创建成功
     */
    private ChatSession getSessionOr404(Long sessionId, Long userId) {
        return chatSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat session not found"));
    }


    /**
     * @Class 初始化空会话
     */

    private String normalizeTitle(String title) {
        if (title == null || title.trim().isBlank()) {
            return "新会话";
        }
        return title.trim();
    }

    /**
     * @param content
     * @return
     * @des 内容判断
     */
    private String normalizeContent(String content) {
        if (content == null || content.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is empty");
        }
        return content.trim();
    }

    /**
     * @param limit
     * @return
     * @des 限制chunk数量
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

    private List<SearchResultResponse> limitContextChunks(
            List<SearchResultResponse> chunks,
            int maxContextChunks
    ) {
        if (chunks.size() <= maxContextChunks) {
            return chunks;
        }
        return chunks.stream().limit(maxContextChunks).toList();
    }


    /**
     * @param messageId
     * @param chunks
     * @return
     * @des 保存消息来源
     */
    private List<ChatSourceResponse> saveSources(Long messageId, List<SearchResultResponse> chunks) {
        List<ChatSourceResponse> responses = new ArrayList<>();

        for (SearchResultResponse chunk : chunks) {
            ChatMessageSource source = new ChatMessageSource();
            source.setMessageId(messageId);
            source.setDocumentId(chunk.getDocumentId());
            source.setDocumentName(chunk.getDocumentName());
            source.setChunkId(chunk.getChunkId());
            source.setChunkIndex(chunk.getChunkIndex());
            source.setContent(chunk.getContent());
            source.setScore(chunk.getScore());

            chatMessageSourceRepository.insert(source);

            ChatSourceResponse response = new ChatSourceResponse();
            response.setDocumentId(chunk.getDocumentId());
            response.setDocumentName(chunk.getDocumentName());
            response.setChunkId(chunk.getChunkId());
            response.setChunkIndex(chunk.getChunkIndex());
            response.setContent(chunk.getContent());
            response.setScore(chunk.getScore());

            responses.add(response);
        }
        return responses;
    }


    /**
     * @param session
     * @param userId
     * @return
     * @Desc 加载历史消息
     */
    private List<ChatMessage> loadPromptHistory(ChatSession session, Long userId) {
        List<ChatMessage> recentMessages = chatMessageRepository.findRecentBySessionIdAndUserIdAndKnowledgeBaseId(
                session.getId(),
                userId, session.getKnowledgeBaseId(),
                MAX_HISTORY_MESSAGES
        );
        return limitHistoryMessages(recentMessages);
    }


    /**
     * @param messages
     * @return
     * @Desc 限制历史消息字符数
     */
    private List<ChatMessage> limitHistoryMessages(List<ChatMessage> messages) {
        List<ChatMessage> selected = new ArrayList<>();
        int remainingChars = MAX_HISTORY_TOTAL_CHARS;

        for (int index = messages.size() - 1;
             index >= 0 && remainingChars > 0 && selected.size() < MAX_HISTORY_MESSAGES;
             index--) {
            ChatMessage message = messages.get(index);
            String content = normalizeHistoryContent(message.getContent());

            if (content.isBlank()) {
                continue;
            }
            content = trimToMaxLength(content, MAX_HISTORY_SINGLE_MESSAGE_CHARS);

            if (content.length() > remainingChars) {
                if (selected.isEmpty()) {
                    selected.add(0, copyMessageWithContent(message, content));
                }
                break;
            }

            selected.add(0, copyMessageWithContent(message, content));
            remainingChars -= content.length();
        }
        return selected;
    }

    private String normalizeHistoryContent(String content) {
        return content == null ? "" : content.trim();
    }

    /**
     * @param value
     * @param maxLength
     * @return
     * @Desc 截断字符串
     */
    private String trimToMaxLength(String value, int maxLength) {
        if (maxLength <= 0) {
            return "";
        }
        if (value.length() <= maxLength) {
            return value;
        }
        if (maxLength <= 3) {
            return value.substring(0, maxLength);
        }
        return value.substring(0, maxLength - 3) + "...";
    }

    /**
     * @param message
     * @param content
     * @return
     * @Desc entity类复制
     */
    private ChatMessage copyMessageWithContent(ChatMessage message, String content) {
        ChatMessage copy = new ChatMessage();
        copy.setId(message.getId());
        copy.setSessionId(message.getSessionId());
        copy.setRole(message.getRole());
        copy.setContent(content);
        copy.setCreatedAt(message.getCreatedAt());
        return copy;
    }
}
