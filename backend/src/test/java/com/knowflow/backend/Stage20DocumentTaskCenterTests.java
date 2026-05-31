package com.knowflow.backend;

import com.knowflow.backend.document.repository.DocumentProcessingJobRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "knowflow.ai.base-url=https://stage20.example.test/v1",
        "knowflow.ai.api-key=stage20-test-secret",
        "knowflow.ai.model=stage20-test-model",
        "knowflow.ai.embedding-model=stage20-embedding-model",
        "knowflow.documents.processing.async-enabled=false"
})
@AutoConfigureMockMvc
class Stage20DocumentTaskCenterTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private DocumentProcessingJobRepository jobRepository;

    private final String password = "stage20-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage20Data();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage20Data();
    }

    @Test
    void globalTaskCenterListsOnlyCurrentUserAccessibleJobsAndSupportsActiveFilter() throws Exception {
        Long ownerId = createUser("stage20_global_owner");
        Long viewerId = createUser("stage20_global_viewer");
        Long outsiderId = createUser("stage20_global_outsider");
        String viewerToken = loginAndGetToken("stage20_global_viewer");
        Long sharedKnowledgeBaseId = createKnowledgeBase(ownerId, "Stage20 Shared KB");
        Long hiddenKnowledgeBaseId = createKnowledgeBase(outsiderId, "Stage20 Hidden KB");
        createMembership(sharedKnowledgeBaseId, ownerId, "OWNER");
        createMembership(sharedKnowledgeBaseId, viewerId, "VIEWER");
        createMembership(hiddenKnowledgeBaseId, outsiderId, "OWNER");
        Long runningDocumentId = createDocument(ownerId, sharedKnowledgeBaseId, "stage20-running.md", "INDEXED");
        Long failedDocumentId = createDocument(ownerId, sharedKnowledgeBaseId, "stage20-failed.md", "FAILED");
        Long hiddenDocumentId = createDocument(outsiderId, hiddenKnowledgeBaseId, "stage20-hidden.md", "INDEXED");
        Long runningJobId = createJob(runningDocumentId, sharedKnowledgeBaseId, ownerId, "UPLOAD_INDEX", "RUNNING", 40);
        Long failedJobId = createJob(failedDocumentId, sharedKnowledgeBaseId, ownerId, "REPROCESS", "FAILED", 100);
        Long hiddenJobId = createJob(hiddenDocumentId, hiddenKnowledgeBaseId, outsiderId, "UPLOAD_INDEX", "RUNNING", 60);

        mockMvc.perform(get("/api/document-processing-jobs")
                        .param("limit", "10")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(runningJobId))
                .andExpect(jsonPath("$[1].id").value(failedJobId))
                .andExpect(content().string(not(containsString(hiddenJobId.toString()))));

        mockMvc.perform(get("/api/document-processing-jobs")
                        .param("status", "ACTIVE")
                        .param("limit", "10")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(runningJobId))
                .andExpect(jsonPath("$[1]").doesNotExist());
    }

    @Test
    void editorCanRetryFailedJobWithoutMutatingOriginalAttempt() throws Exception {
        Long ownerId = createUser("stage20_retry_owner");
        Long editorId = createUser("stage20_retry_editor");
        String editorToken = loginAndGetToken("stage20_retry_editor");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage20 Retry KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, editorId, "EDITOR");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "stage20-retry.md", "FAILED");
        jdbcTemplate.update("""
                        update documents
                        set source_text = 'stage20 retry source text',
                            source_text_updated_at = now()
                        where id = ?
                        """,
                documentId);
        Long failedJobId = createJob(documentId, knowledgeBaseId, ownerId, "REPROCESS", "FAILED", 100);

        MvcResult retry = mockMvc.perform(post("/api/document-processing-jobs/{jobId}/retry", failedJobId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value(documentId))
                .andExpect(jsonPath("$.jobType").value("REPROCESS"))
                .andExpect(jsonPath("$.status").value("SUCCEEDED"))
                .andReturn();

        Long retryJobId = readId(retry);
        assertThat(retryJobId).isNotEqualTo(failedJobId);
        assertThat(readJobStatus(failedJobId)).isEqualTo("FAILED");
    }

    @Test
    void viewerCannotRetryOrCancelButNonMemberStillGetsNotFound() throws Exception {
        Long ownerId = createUser("stage20_acl_owner");
        Long viewerId = createUser("stage20_acl_viewer");
        createUser("stage20_acl_nonmember");
        String viewerToken = loginAndGetToken("stage20_acl_viewer");
        String nonMemberToken = loginAndGetToken("stage20_acl_nonmember");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage20 ACL KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, viewerId, "VIEWER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "stage20-acl.md", "FAILED");
        Long failedJobId = createJob(documentId, knowledgeBaseId, ownerId, "REPROCESS", "FAILED", 100);
        Long queuedJobId = createJob(documentId, knowledgeBaseId, ownerId, "UPLOAD_INDEX", "QUEUED", 0);

        mockMvc.perform(post("/api/document-processing-jobs/{jobId}/retry", failedJobId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/document-processing-jobs/{jobId}/cancel", queuedJobId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/document-processing-jobs/{jobId}/retry", failedJobId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void cancelQueuedJobPreventsLateTerminalRepositoryUpdates() throws Exception {
        Long ownerId = createUser("stage20_cancel_owner");
        String ownerToken = loginAndGetToken("stage20_cancel_owner");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage20 Cancel KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "stage20-cancel.md", "PROCESSING");
        Long queuedJobId = createJob(documentId, knowledgeBaseId, ownerId, "UPLOAD_INDEX", "QUEUED", 0);

        mockMvc.perform(post("/api/document-processing-jobs/{jobId}/cancel", queuedJobId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"))
                .andExpect(jsonPath("$.stage").value("CANCELED"));

        jobRepository.markRunning(queuedJobId, 10, "READ_SOURCE", "late run");
        jobRepository.markSucceeded(queuedJobId, "COMPLETED", "late success");
        jobRepository.markFailed(queuedJobId, "FAILED", "late fail", "late failure");

        assertThat(readJobStatus(queuedJobId)).isEqualTo("CANCELED");
    }

    @Test
    void diagnosticsReturnSanitizedSystemStatus() throws Exception {
        createUser("stage20_diag_user");
        String token = loginAndGetToken("stage20_diag_user");

        mockMvc.perform(get("/api/system/diagnostics")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OK"))
                .andExpect(jsonPath("$.database.reachable").value(true))
                .andExpect(jsonPath("$.model.chatFallbackConfigured").value(true))
                .andExpect(jsonPath("$.model.embeddingFallbackConfigured").value(true))
                .andExpect(content().string(not(containsString("stage20-test-secret"))))
                .andExpect(content().string(not(containsString("stage20.example.test"))))
                .andExpect(content().string(not(containsString("stage20-test-model"))));
    }

    private String loginAndGetToken(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", username,
                                "password", password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("accessToken").asText();
    }

    private Long readId(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("id").asLong();
    }

    private Long createUser(String username) {
        return jdbcTemplate.queryForObject("""
                        insert into users (username, password_hash, role)
                        values (?, ?, 'USER')
                        on conflict (username)
                        do update set password_hash = excluded.password_hash,
                                      role = excluded.role,
                                      updated_at = now()
                        returning id
                        """,
                Long.class,
                username,
                passwordEncoder.encode(password));
    }

    private Long createKnowledgeBase(Long userId, String name) {
        return jdbcTemplate.queryForObject("""
                        insert into knowledge_bases (name, description, status, featured, theme_id, created_by)
                        values (?, 'stage20 test', 'ACTIVE', false, 'blue', ?)
                        returning id
                        """,
                Long.class,
                name,
                userId);
    }

    private Long createMembership(Long knowledgeBaseId, Long userId, String role) {
        return jdbcTemplate.queryForObject("""
                        insert into knowledge_base_members (knowledge_base_id, user_id, role)
                        values (?, ?, ?)
                        returning id
                        """,
                Long.class,
                knowledgeBaseId,
                userId,
                role);
    }

    private Long createDocument(Long userId, Long knowledgeBaseId, String filename, String status) {
        return jdbcTemplate.queryForObject("""
                        insert into documents (
                            knowledge_base_id,
                            original_filename,
                            content_type,
                            size_bytes,
                            status,
                            error_message,
                            created_by
                        )
                        values (?, ?, 'text/markdown', 100, ?, null, ?)
                        returning id
                        """,
                Long.class,
                knowledgeBaseId,
                filename,
                status,
                userId);
    }

    private Long createJob(
            Long documentId,
            Long knowledgeBaseId,
            Long requestedBy,
            String jobType,
            String status,
            int progressPercent) {
        return jdbcTemplate.queryForObject("""
                        insert into document_processing_jobs (
                            document_id,
                            knowledge_base_id,
                            requested_by,
                            job_type,
                            status,
                            progress_percent,
                            stage,
                            message,
                            error_message,
                            started_at,
                            finished_at
                        )
                        values (?, ?, ?, ?, ?, ?, ?, ?, ?, now(), case when ? in ('SUCCEEDED', 'FAILED', 'CANCELED') then now() else null end)
                        returning id
                        """,
                Long.class,
                documentId,
                knowledgeBaseId,
                requestedBy,
                jobType,
                status,
                progressPercent,
                status,
                "stage20 " + status.toLowerCase(),
                "FAILED".equals(status) ? "stage20 failed safely" : null,
                status);
    }

    private String readJobStatus(Long jobId) {
        return jdbcTemplate.queryForObject("select status from document_processing_jobs where id = ?", String.class, jobId);
    }

    private void cleanStage20Data() {
        jdbcTemplate.update("""
                delete from document_processing_jobs
                where requested_by in (select id from users where username like 'stage20_%')
                   or document_id in (
                       select d.id
                       from documents d
                       join users u on u.id = d.created_by
                       where u.username like 'stage20_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage20_%'
                )
                """);
        jdbcTemplate.update("""
                delete from documents
                where created_by in (select id from users where username like 'stage20_%')
                """);
        jdbcTemplate.update("""
                delete from knowledge_base_members
                where user_id in (select id from users where username like 'stage20_%')
                   or knowledge_base_id in (
                       select kb.id
                       from knowledge_bases kb
                       join users u on u.id = kb.created_by
                       where u.username like 'stage20_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (select id from users where username like 'stage20_%')
                """);
        jdbcTemplate.update("delete from users where username like 'stage20_%'");
    }
}
