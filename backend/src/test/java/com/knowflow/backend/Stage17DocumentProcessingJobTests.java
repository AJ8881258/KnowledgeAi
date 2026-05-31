package com.knowflow.backend;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "knowflow.ai.base-url=http://127.0.0.1:1/v1",
        "knowflow.ai.api-key=stage17-test-secret",
        "knowflow.ai.model=stage17-test-model",
        "knowflow.documents.processing.async-enabled=false"
})
@AutoConfigureMockMvc
class Stage17DocumentProcessingJobTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage17-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage17Data();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage17Data();
    }

    @Test
    void uploadCreatesSucceededProcessingJobWithProgressHistoryFields() throws Exception {
        Long userId = createUser("stage17_upload_owner");
        String token = loginAndGetToken("stage17_upload_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage17 Upload KB");
        createMembership(knowledgeBaseId, userId, "OWNER");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "stage17-upload.txt",
                                "text/plain",
                                "stage17 upload job marker".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.chunkCount").value(1))
                .andReturn();

        Long documentId = readId(upload);
        Map<String, Object> job = jdbcTemplate.queryForMap("""
                        select document_id, knowledge_base_id, requested_by, job_type, status,
                               progress_percent, stage, message, error_message, started_at, finished_at
                        from document_processing_jobs
                        where document_id = ?
                        """,
                documentId);
        assertThat(((Number) job.get("document_id")).longValue()).isEqualTo(documentId);
        assertThat(((Number) job.get("knowledge_base_id")).longValue()).isEqualTo(knowledgeBaseId);
        assertThat(((Number) job.get("requested_by")).longValue()).isEqualTo(userId);
        assertThat(job.get("job_type")).isEqualTo("UPLOAD_INDEX");
        assertThat(job.get("status")).isEqualTo("SUCCEEDED");
        assertThat(job.get("progress_percent")).isEqualTo(100);
        assertThat(job.get("stage")).isEqualTo("COMPLETED");
        assertThat(job.get("message")).isEqualTo("文档处理完成");
        assertThat(job.get("error_message")).isNull();
        assertThat(job.get("started_at")).isNotNull();
        assertThat(job.get("finished_at")).isNotNull();

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/document-processing-jobs", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].documentId").value(documentId))
                .andExpect(jsonPath("$[0].jobType").value("UPLOAD_INDEX"))
                .andExpect(jsonPath("$[0].status").value("SUCCEEDED"))
                .andExpect(jsonPath("$[0].progressPercent").value(100));
    }

    @Test
    void reprocessCreatesJobAndReplacesChunksForEditor() throws Exception {
        Long ownerId = createUser("stage17_reprocess_owner");
        Long editorId = createUser("stage17_reprocess_editor");
        String editorToken = loginAndGetToken("stage17_reprocess_editor");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage17 Reprocess KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, editorId, "EDITOR");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "stage17-reprocess.md", "INDEXED");
        Long oldChunkId = createChunk(documentId, knowledgeBaseId, 0, "stage17 old chunk");
        jdbcTemplate.update("""
                        update documents
                        set source_text = 'stage17 rebuilt source from stored text',
                            source_text_updated_at = now()
                        where id = ?
                        """,
                documentId);

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andExpect(jsonPath("$.chunkCount").value(1));

        assertThat(jdbcTemplate.queryForObject("select count(*) from document_chunks where id = ?", Integer.class, oldChunkId))
                .isZero();
        assertThat(jdbcTemplate.queryForObject("""
                        select content
                        from document_chunks
                        where document_id = ?
                        """,
                String.class,
                documentId)).isEqualTo("stage17 rebuilt source from stored text");

        mockMvc.perform(get("/api/documents/{documentId}/processing-jobs", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].jobType").value("REPROCESS"))
                .andExpect(jsonPath("$[0].status").value("SUCCEEDED"));
    }

    @Test
    void viewerCanReadJobsButCannotCreateReprocessJob() throws Exception {
        Long ownerId = createUser("stage17_viewer_owner");
        Long viewerId = createUser("stage17_viewer_user");
        String ownerToken = loginAndGetToken("stage17_viewer_owner");
        String viewerToken = loginAndGetToken("stage17_viewer_user");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage17 Viewer KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, viewerId, "VIEWER");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "stage17-viewer.txt",
                                "text/plain",
                                "stage17 viewer job marker".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();
        Long documentId = readId(upload);

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/document-processing-jobs", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].documentId").value(documentId));

        mockMvc.perform(post("/api/documents/{documentId}/reprocess", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonMemberCannotReadProcessingJobs() throws Exception {
        Long ownerId = createUser("stage17_hidden_owner");
        createUser("stage17_hidden_nonmember");
        String ownerToken = loginAndGetToken("stage17_hidden_owner");
        String nonMemberToken = loginAndGetToken("stage17_hidden_nonmember");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage17 Hidden KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "stage17-hidden.txt",
                                "text/plain",
                                "stage17 hidden job marker".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isCreated())
                .andReturn();
        Long documentId = readId(upload);
        Long jobId = jdbcTemplate.queryForObject(
                "select id from document_processing_jobs where document_id = ?",
                Long.class,
                documentId);

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/document-processing-jobs", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/documents/{documentId}/processing-jobs", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/document-processing-jobs/{jobId}", jobId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void failedUploadCreatesFailedJobAndSanitizedError() throws Exception {
        Long userId = createUser("stage17_failed_owner");
        String token = loginAndGetToken("stage17_failed_owner");
        Long knowledgeBaseId = createKnowledgeBase(userId, "Stage17 Failed KB");
        createMembership(knowledgeBaseId, userId, "OWNER");

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "stage17-failed.txt",
                                "text/plain",
                                "   \n ".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Document content is blank"))
                .andExpect(content().string(not(containsString("stage17-test-secret"))));

        Long documentId = jdbcTemplate.queryForObject("""
                        select id
                        from documents
                        where created_by = ? and original_filename = 'stage17-failed.txt'
                        """,
                Long.class,
                userId);
        Map<String, Object> job = jdbcTemplate.queryForMap("""
                        select status, progress_percent, stage, message, error_message
                        from document_processing_jobs
                        where document_id = ?
                        """,
                documentId);
        assertThat(job.get("status")).isEqualTo("FAILED");
        assertThat(job.get("progress_percent")).isEqualTo(100);
        assertThat(job.get("stage")).isEqualTo("FAILED");
        assertThat(job.get("message")).isEqualTo("文档处理失败");
        assertThat(job.get("error_message")).isEqualTo("Document content is blank");
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
                        values (?, 'stage17 test', 'ACTIVE', false, 'blue', ?)
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

    private Long createChunk(Long documentId, Long knowledgeBaseId, int chunkIndex, String content) {
        return jdbcTemplate.queryForObject("""
                        insert into document_chunks (
                            document_id,
                            knowledge_base_id,
                            chunk_index,
                            content,
                            char_count
                        )
                        values (?, ?, ?, ?, ?)
                        returning id
                        """,
                Long.class,
                documentId,
                knowledgeBaseId,
                chunkIndex,
                content,
                content.length());
    }

    private void cleanStage17Data() {
        jdbcTemplate.update("""
                delete from document_processing_jobs
                where requested_by in (select id from users where username like 'stage17_%')
                   or document_id in (
                       select d.id
                       from documents d
                       join users u on u.id = d.created_by
                       where u.username like 'stage17_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage17_%'
                )
                """);
        jdbcTemplate.update("""
                delete from documents
                where created_by in (select id from users where username like 'stage17_%')
                """);
        jdbcTemplate.update("""
                delete from knowledge_base_members
                where user_id in (select id from users where username like 'stage17_%')
                   or knowledge_base_id in (
                       select kb.id
                       from knowledge_bases kb
                       join users u on u.id = kb.created_by
                       where u.username like 'stage17_%'
                   )
                """);
        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (select id from users where username like 'stage17_%')
                """);
        jdbcTemplate.update("delete from users where username like 'stage17_%'");
    }
}
