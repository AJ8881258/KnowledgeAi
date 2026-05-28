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
     * @param sessionId       会话ID
     * @param userId          当前用户ID
     * @param knowledgeBaseId 会话所属知识库ID
     * @param question        用户刚发送的问题
     * @param historyMessages 进入 prompt 的历史消息
     * @Desc 后台完成检索、prompt、模型调用、助手消息和引用来源保存。
     */
    @Async
    public void generate(Long sessionId, Long userId, Long knowledgeBaseId, String question, List<ChatMessage> historyMessages) {
        try {
            // 助手消息和引用来源放在同一个事务里保存，避免只落库回答或只落库 sources 的半截结果。
            transactionTemplate.executeWithoutResult(status -> doGenerate(sessionId, userId, knowledgeBaseId, question, historyMessages));
        } catch (RuntimeException exception) {
            // 生成失败状态使用独立事务保存；只落库后端白名单里的脱敏文案，避免把供应商原始错误、Key 或完整地址写进会话。
            String lastErrorMessage = safeMessage(exception);
            transactionTemplate.executeWithoutResult(status ->
                    chatSessionRepository.updateStatus(sessionId, userId, "FAILED", lastErrorMessage, true)
            );
        }
    }

    /**
     * @param sessionId       会话ID，用于保存助手消息和更新会话状态
     * @param userId          当前 JWT 用户ID，用于读取当前用户 RAG 参数和模型配置
     * @param knowledgeBaseId 会话所属知识库ID，用于把检索范围限制在当前知识库
     * @param question        用户刚发送的问题
     * @param historyMessages 当前用户当前会话允许进入 prompt 的历史消息
     * @Desc 生成助手消息。空检索时与旧逻辑不同：仍调用当前用户模型配置生成回答，但不保存任何引用来源。
     */
    private void doGenerate(Long sessionId, Long userId, Long knowledgeBaseId, String question, List<ChatMessage> historyMessages) {
        // 使用当前用户自己的 RAG 参数，避免一个用户的 topK、temperature 影响其他用户问答。
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
        String answer = chatModelClient.chat(userId, prompt, ragSettings.getTemperature());

        ChatMessage assistantMessage = new ChatMessage();
        assistantMessage.setSessionId(sessionId);
        assistantMessage.setRole("ASSISTANT");
        assistantMessage.setContent(answer);
        chatMessageRepository.insert(assistantMessage);

        if (!contextChunks.isEmpty()) {
            saveSources(assistantMessage.getId(), contextChunks);
        }

        // 生成完成后设置未读，非当前会话也能在列表里提醒用户查看。
        chatSessionRepository.updateStatus(sessionId, userId, "IDLE", null, true);
    }

    /**
     * @param chunks           检索阶段按相关度排序后的候选 chunk
     * @param maxContextChunks 允许进入 prompt 和 sources 的最大 chunk 数
     * @return 最终进入 prompt 的 chunk 列表
     * @Desc topK 控制检索候选数量，maxContextChunks 控制真正喂给模型和保存为引用来源的数量。
     */
    private List<SearchResultResponse> limitContextChunks(List<SearchResultResponse> chunks, int maxContextChunks) {
        if (chunks.size() <= maxContextChunks) {
            return chunks;
        }
        return chunks.stream().limit(maxContextChunks).toList();
    }

    /**
     * @param messageId 已保存的助手消息ID
     * @param chunks    实际进入 prompt 的知识库片段
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
