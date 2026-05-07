package com.knowflow.backend.knowledgebase;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// @RestController 表示这是 REST API 控制器
// 方法返回的对象会自动转换成 JSON
@RestController
// 这个 Controller 下面所有接口都以 /api/knowledge-bases 开头
@RequestMapping("/api/knowledge-bases")
public class KnowledgeBaseController {

    // 注入 Repository，用它查询数据库
    private final KnowledgeBaseRepository knowledgeBaseRepository;


    // 构造器注入
    // Spring 会自动把 KnowledgeBaseRepository 传进来
    public KnowledgeBaseController(KnowledgeBaseRepository knowledgeBaseRepository) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
    }

    // 查询所有知识库
    @GetMapping
    public List<KnowledgeBase> listKnowledgeBases() {
        return knowledgeBaseRepository.findAll();
    }

    // 查询指定 ID 的知识库
    @GetMapping("/{id}")
    public KnowledgeBase getKnowledgeBase(@PathVariable Long id) {
        return knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Knowledge base not found: " + id));
    }
}
