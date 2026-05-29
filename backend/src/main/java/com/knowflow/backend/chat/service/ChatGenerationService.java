package com.knowflow.backend.chat.service;

import com.knowflow.backend.chat.entity.ChatMessage;
import com.knowflow.backend.chat.entity.ChatMessageSource;
import com.knowflow.backend.chat.model.ChatModelClient;
import com.knowflow.backend.chat.model.PromptBuilder;
import com.knowflow.backend.chat.repository.ChatMessageRepository;
import com.knowflow.backend.chat.repository.ChatMessageSourceRepository;
import com.knowflow.backend.chat.repository.ChatSessionRepository;
import com.knowflow.backend.document.dto.response.SearchResultResponse;
import com.knowflow.backend.document.repository.DocumentChunkRepository;
import com.knowflow.backend.settings.entity.UserRagSettings;
import com.knowflow.backend.settings.service.SettingsService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

import static com.knowflow.backend.common.model.ModelProviderErrors.safeMessage;

@Service
public class ChatGenerationService {
    private final DocumentChunkRepository documentChunkRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageSourceRepository chatMessageSourceRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final PromptBuilder promptBuilder;
    private final ChatModelClient chatModelClient;
    private final SettingsService settingsService;
    private final TransactionTemplate transactionTemplate;

    public ChatGenerationService(
            DocumentChunkRepository documentChunkRepository,
            ChatMessageRepository chatMessageRepository,
            ChatMessageSourceRepository chatMessageSourceRepository,
            ChatSessionRepository chatSessionRepository,
            PromptBuilder promptBuilder,
            ChatModelClient chatModelClient,
            SettingsService settingsService,
            PlatformTransactionManager transactionManager) {
        this.documentChunkRepository = documentChunkRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatMessageSourceRepository = chatMessageSourceRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.promptBuilder = promptBuilder;
        this.chatModelClient = chatModelClient;
        this.settingsService = settingsService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * @param sessionId       会话 ID，用于保存助手消息并更新生成状态。
     * @param userId          当前 JWT 用户 ID，用于读取该用户自己的 RAG 参数和模型鉴权配置。
     * @param knowledgeBaseId 会话所属知识库 ID，用于限定检索范围。
     * @param question        用户刚发送的问题。
     * @param historyMessages 当前用户当前会话允许进入 prompt 的历史消息。
     * @param modelOverride   本次 Chat 请求选择的模型；只覆盖 model，不覆盖当前用户 Base URL/API Key。
     * @Desc 后台异步完成检索、prompt 构造、模型调用、助手消息和 sources 落库。
     * 空检索与旧逻辑不同：仍调用模型生成回答，但 sources 保持空数组，并在 prompt 中要求说明无可引用知识库片段。
     * 失败时只写入脱敏错误和 FAILED 状态，也把 unread 置为 true，因为“后台生成已结束且需要用户处理”
     * 与回答成功一样都属于新的会话终态；前端仍通过 status 区分成功或失败。
     */
    @Async
    public void generate(
            Long sessionId,
            Long userId,
            Long knowledgeBaseId,
            String question,
            List<ChatMessage> historyMessages,
            String modelOverride
    ) {
        try {
            transactionTemplate.executeWithoutResult(status ->
                    doGenerate(sessionId, userId, knowledgeBaseId, question, historyMessages, modelOverride)
            );
        } catch (RuntimeException exception) {
            String lastErrorMessage = safeMessage(exception);
            transactionTemplate.executeWithoutResult(status ->
                    chatSessionRepository.updateStatus(sessionId, userId, "FAILED", lastErrorMessage, true)
            );
        }
    }

    private void doGenerate(
            Long sessionId,
            Long userId,
            Long knowledgeBaseId,
            String question,
            List<ChatMessage> historyMessages,
            String modelOverride
    ) {
        UserRagSettings ragSettings = settingsService.getEffectiveRagSettings(userId);
        List<SearchResultResponse> retrievedChunks = documentChunkRepository.searchIndexedChunks(
                knowledgeBaseId,
                userId,
                question,
                ragSettings.getTopK()
        );
        List<SearchResultResponse> contextChunks = limitContextChunks(retrievedChunks, ragSettings.getMaxContextChunks());

        String prompt = contextChunks.isEmpty()
                ? promptBuilder.buildWithoutSources(question, historyMessages)
                : promptBuilder.build(question, contextChunks, historyMessages);
        String answer = chatModelClient.chat(userId, prompt, ragSettings.getTemperature(), modelOverride);

        ChatMessage assistantMessage = new ChatMessage();
        assistantMessage.setSessionId(sessionId);
        assistantMessage.setRole("ASSISTANT");
        assistantMessage.setContent(answer);
        chatMessageRepository.insert(assistantMessage);

        if (!contextChunks.isEmpty()) {
            saveSources(assistantMessage.getId(), contextChunks);
        }

        chatSessionRepository.updateStatus(sessionId, userId, "IDLE", null, true);
    }

    /**
     * @param chunks           检索阶段按相关度排序后的候选 chunk。
     * @param maxContextChunks 允许进入 prompt 和 sources 的最大 chunk 数。
     * @return 最终进入 prompt 的 chunk 列表。
     * @Desc topK 控制检索候选数量，maxContextChunks 控制真正喂给模型和保存为引用来源的数量。
     */
    private List<SearchResultResponse> limitContextChunks(List<SearchResultResponse> chunks, int maxContextChunks) {
        if (chunks.size() <= maxContextChunks) {
            return chunks;
        }
        return chunks.stream().limit(maxContextChunks).toList();
    }

    /**
     * @param messageId 已保存的助手消息 ID。
     * @param chunks    实际进入 prompt 的知识库片段。
     * @Desc 只为真实参与回答的 chunk 保存引用来源；空检索时不会调用本方法，避免伪造 sources。
     */
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
            chatMessageSourceRepository.insert(source);
        }
    }
}
