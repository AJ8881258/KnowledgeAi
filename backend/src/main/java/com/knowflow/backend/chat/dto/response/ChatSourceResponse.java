package com.knowflow.backend.chat.dto.response;


import com.knowflow.backend.chat.entity.ChatMessageSource;
import lombok.Data;

/**
 * @class 消息来源响应实体
 * */

@Data
public class ChatSourceResponse {
    private Long documentId;
    private String documentName;
    private Long chunkId;
    private Integer chunkIndex;
    private String content;
    private Double score;
    private Double hybridScore;
    private Double fulltextScore;
    private Double semanticScore;
    private String retrievalMode;

    public ChatSourceResponse(){}

    public ChatSourceResponse(ChatMessageSource source){
        this.documentId = source.getDocumentId();
        this.documentName = source.getDocumentName();
        this.chunkId = source.getChunkId();
        this.chunkIndex = source.getChunkIndex();
        this.content = source.getContent();
        this.score = source.getScore();
        this.hybridScore = source.getHybridScore();
        this.fulltextScore = source.getFulltextScore();
        this.semanticScore = source.getSemanticScore();
        this.retrievalMode = source.getRetrievalMode();
    }
}
