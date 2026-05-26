package com.knowflow.backend;

import com.knowflow.backend.chat.model.ChatModelClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = {KnowflowBackendApplication.class, Stage12CollaborationTests.Stage12ModelTestConfig.class},
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage12-test-secret",
                "knowflow.ai.model=stage12-test-model"
        }
)
@AutoConfigureMockMvc
class Stage12CollaborationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RecordingChatModelClient modelClient;

    private final String password = "stage12-password";

    @BeforeEach
    void cleanBefore() {
        modelClient.reset();
        cleanStage12Data();
    }

    @AfterEach
    void cleanAfter() {
        modelClient.reset();
        cleanStage12Data();
    }

    @Test
    void creatingKnowledgeBaseAutomaticallyCreatesOwnerMembershipAndRoleFields() throws Exception {
        Long ownerId = createUser("stage12_auto_owner");
        String ownerToken = loginAndGetToken("stage12_auto_owner");

        MvcResult result = mockMvc.perform(post("/api/knowledge-bases")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Stage12 Owner KB",
                                  "description": "created by owner",
                                  "featured": false,
                                  "themeId": "blue"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessRole").value("OWNER"))
                .andExpect(jsonPath("$.ownedByMe").value(true))
                .andExpect(jsonPath("$.sharedWithMe").value(false))
                .andReturn();

        Long knowledgeBaseId = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("id")
                .asLong();

        Map<String, Object> member = jdbcTemplate.queryForMap("""
                        select user_id, role
                        from knowledge_base_members
                        where knowledge_base_id = ? and user_id = ?
                        """,
                knowledgeBaseId,
                ownerId);

        assertThat(member.get("user_id")).isEqualTo(ownerId);
        assertThat(member.get("role")).isEqualTo("OWNER");
    }

    @Test
    void ownerCanAddEditorAndViewerButEditorCannotManageMembers() throws Exception {
        Long ownerId = createUser("stage12_member_owner");
        createUser("stage12_member_editor");
        createUser("stage12_member_viewer");
        String ownerToken = loginAndGetToken("stage12_member_owner");
        String editorToken = loginAndGetToken("stage12_member_editor");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage12 Member KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");

        MvcResult editor = mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/members", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "stage12_member_editor",
                                  "role": "EDITOR"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("stage12_member_editor"))
                .andExpect(jsonPath("$.role").value("EDITOR"))
                .andReturn();

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/members", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "stage12_member_viewer",
                                  "role": "VIEWER"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("stage12_member_viewer"))
                .andExpect(jsonPath("$.role").value("VIEWER"));

        Long editorMemberId = objectMapper.readTree(editor.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("id")
                .asLong();

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/members", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));

        mockMvc.perform(patch("/api/knowledge-bases/{knowledgeBaseId}/members/{memberId}", knowledgeBaseId, editorMemberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "VIEWER"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void ownerCannotBeRemovedOrDowngradedThroughMemberApis() throws Exception {
        Long ownerId = createUser("stage12_protected_owner");
        String ownerToken = loginAndGetToken("stage12_protected_owner");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage12 Protected Owner KB");
        Long ownerMemberId = createMembership(knowledgeBaseId, ownerId, "OWNER");

        mockMvc.perform(patch("/api/knowledge-bases/{knowledgeBaseId}/members/{memberId}", knowledgeBaseId, ownerMemberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "VIEWER"
                                }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/knowledge-bases/{knowledgeBaseId}/members/{memberId}", knowledgeBaseId, ownerMemberId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isBadRequest());

        String role = jdbcTemplate.queryForObject("""
                        select role
                        from knowledge_base_members
                        where id = ?
                        """,
                String.class,
                ownerMemberId);
        assertThat(role).isEqualTo("OWNER");
    }

    @Test
    void sharedKnowledgeBaseAppearsInListWithRoleFields() throws Exception {
        Long ownerId = createUser("stage12_list_owner");
        Long viewerId = createUser("stage12_list_viewer");
        String viewerToken = loginAndGetToken("stage12_list_viewer");
        Long ownedKnowledgeBaseId = createKnowledgeBase(viewerId, "Stage12 Viewer Own KB");
        Long sharedKnowledgeBaseId = createKnowledgeBase(ownerId, "Stage12 Shared To Viewer KB");
        createMembership(ownedKnowledgeBaseId, viewerId, "OWNER");
        createMembership(sharedKnowledgeBaseId, ownerId, "OWNER");
        createMembership(sharedKnowledgeBaseId, viewerId, "VIEWER");

        MvcResult result = mockMvc.perform(get("/api/knowledge-bases")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Stage12 Viewer Own KB")))
                .andExpect(content().string(containsString("Stage12 Shared To Viewer KB")))
                .andReturn();

        JsonNode roots = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        JsonNode ownedKnowledgeBase = findKnowledgeBaseInList(roots, ownedKnowledgeBaseId);
        JsonNode sharedKnowledgeBase = findKnowledgeBaseInList(roots, sharedKnowledgeBaseId);

        assertThat(ownedKnowledgeBase.get("accessRole").asText()).isEqualTo("OWNER");
        assertThat(ownedKnowledgeBase.get("ownedByMe").asBoolean()).isTrue();
        assertThat(ownedKnowledgeBase.get("sharedWithMe").asBoolean()).isFalse();
        assertThat(sharedKnowledgeBase.get("accessRole").asText()).isEqualTo("VIEWER");
        assertThat(sharedKnowledgeBase.get("ownedByMe").asBoolean()).isFalse();
        assertThat(sharedKnowledgeBase.get("sharedWithMe").asBoolean()).isTrue();
    }

    @Test
    void editorCanUploadSearchAndChatButCannotDeleteKnowledgeBaseOrManageMembers() throws Exception {
        Long ownerId = createUser("stage12_editor_owner");
        Long editorId = createUser("stage12_editor_user");
        String editorToken = loginAndGetToken("stage12_editor_user");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage12 Editor KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, editorId, "EDITOR");

        MvcResult upload = mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "editor.md",
                                "text/markdown",
                                "stage12 editor searchable marker".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INDEXED"))
                .andReturn();

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "stage12 editor searchable",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.length()").value(1));

        Long sessionId = createSession(knowledgeBaseId, editorToken, "Editor Session");

        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "stage12 editor searchable",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message.sources.length()").value(1));

        mockMvc.perform(delete("/api/knowledge-bases/{knowledgeBaseId}", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/members", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
                .andExpect(status().isForbidden());

        Long documentId = readDocumentId(upload);
        mockMvc.perform(delete("/api/documents/{documentId}", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + editorToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void viewerCanReadSearchAndChatButCannotWrite() throws Exception {
        Long ownerId = createUser("stage12_viewer_owner");
        Long viewerId = createUser("stage12_viewer_user");
        String viewerToken = loginAndGetToken("stage12_viewer_user");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage12 Viewer KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, viewerId, "VIEWER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "viewer.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage12 viewer searchable marker");

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessRole").value("VIEWER"));

        mockMvc.perform(get("/api/documents/{documentId}", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "stage12 viewer searchable",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results.length()").value(1));

        Long sessionId = createSession(knowledgeBaseId, viewerToken, "Viewer Session");
        mockMvc.perform(post("/api/chat/sessions/{sessionId}/messages", sessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "stage12 viewer searchable",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message.sources.length()").value(1));

        mockMvc.perform(patch("/api/knowledge-bases/{knowledgeBaseId}", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Viewer Rename",
                                  "description": "blocked",
                                  "featured": false,
                                  "themeId": "blue"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(multipart("/api/knowledge-bases/{knowledgeBaseId}/documents", knowledgeBaseId)
                        .file(new MockMultipartFile(
                                "file",
                                "blocked.md",
                                "text/markdown",
                                "blocked".getBytes(StandardCharsets.UTF_8)))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/documents/{documentId}", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonMemberGets404ForKnowledgeBaseDocumentSearchAndChatAccess() throws Exception {
        Long ownerId = createUser("stage12_hidden_owner");
        createUser("stage12_hidden_nonmember");
        String nonMemberToken = loginAndGetToken("stage12_hidden_nonmember");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage12 Hidden KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        Long documentId = createDocument(ownerId, knowledgeBaseId, "hidden.md", "INDEXED");
        createChunk(documentId, knowledgeBaseId, 0, "stage12 hidden marker");

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/documents/{documentId}", documentId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/search", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "stage12 hidden",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/chat/sessions", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + nonMemberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Blocked Session"
                                }
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void sharedKnowledgeBaseDoesNotShareOtherMembersChatHistory() throws Exception {
        Long ownerId = createUser("stage12_chat_owner");
        Long viewerId = createUser("stage12_chat_viewer");
        String ownerToken = loginAndGetToken("stage12_chat_owner");
        String viewerToken = loginAndGetToken("stage12_chat_viewer");
        Long knowledgeBaseId = createKnowledgeBase(ownerId, "Stage12 Chat Isolation KB");
        createMembership(knowledgeBaseId, ownerId, "OWNER");
        createMembership(knowledgeBaseId, viewerId, "VIEWER");

        Long ownerSessionId = createSession(knowledgeBaseId, ownerToken, "Owner Private Session");
        createChatMessage(ownerSessionId, "USER", "stage12-owner-private-chat-history");
        Long viewerSessionId = createSession(knowledgeBaseId, viewerToken, "Viewer Private Session");

        mockMvc.perform(get("/api/knowledge-bases/{knowledgeBaseId}/chat/sessions", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Viewer Private Session")))
                .andExpect(content().string(not(containsString("Owner Private Session"))))
                .andExpect(content().string(not(containsString("stage12-owner-private-chat-history"))));

        mockMvc.perform(get("/api/chat/sessions/{sessionId}/messages", ownerSessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/chat/sessions/{sessionId}/messages", viewerSessionId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + viewerToken))
                .andExpect(status().isOk());
    }

    private String loginAndGetToken(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", username,
                                "password", password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("accessToken").asText();
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
                        values (?, 'stage12 test', 'ACTIVE', false, 'blue', ?)
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

    private Long createSession(Long knowledgeBaseId, String token, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/knowledge-bases/{knowledgeBaseId}/chat/sessions", knowledgeBaseId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("title", title))))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("id").asLong();
    }

    private Long createChatMessage(Long sessionId, String role, String content) {
        return jdbcTemplate.queryForObject("""
                        insert into chat_messages (session_id, role, content)
                        values (?, ?, ?)
                        returning id
                        """,
                Long.class,
                sessionId,
                role,
                content);
    }

    private Long readDocumentId(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.get("id").asLong();
    }

    private JsonNode findKnowledgeBaseInList(JsonNode roots, Long knowledgeBaseId) {
        for (JsonNode root : roots) {
            if (root.get("id").asLong() == knowledgeBaseId) {
                return root;
            }
        }
        throw new AssertionError("Knowledge base not found in response: " + knowledgeBaseId);
    }

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject("""
                        select exists (
                            select 1
                            from information_schema.tables
                            where table_schema = 'public'
                              and table_name = ?
                        )
                        """,
                Boolean.class,
                tableName);
        return Boolean.TRUE.equals(exists);
    }

    private void cleanStage12Data() {
        jdbcTemplate.update("""
                delete from chat_message_sources
                where message_id in (
                    select m.id
                    from chat_messages m
                    join chat_sessions s on s.id = m.session_id
                    join users u on u.id = s.user_id
                    where u.username like 'stage12_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_messages
                where session_id in (
                    select s.id
                    from chat_sessions s
                    join users u on u.id = s.user_id
                    where u.username like 'stage12_%'
                )
                """);

        jdbcTemplate.update("""
                delete from chat_sessions
                where user_id in (
                    select id from users where username like 'stage12_%'
                )
                """);

        jdbcTemplate.update("""
                delete from document_chunks
                where document_id in (
                    select d.id
                    from documents d
                    join users u on u.id = d.created_by
                    where u.username like 'stage12_%'
                )
                """);

        jdbcTemplate.update("""
                delete from documents
                where created_by in (
                    select id from users where username like 'stage12_%'
                )
                """);

        if (tableExists("knowledge_base_members")) {
            jdbcTemplate.update("""
                    delete from knowledge_base_members
                    where user_id in (
                        select id from users where username like 'stage12_%'
                    )
                    """);

            jdbcTemplate.update("""
                    delete from knowledge_base_members
                    where knowledge_base_id in (
                        select kb.id
                        from knowledge_bases kb
                        join users u on u.id = kb.created_by
                        where u.username like 'stage12_%'
                    )
                    """);
        }

        jdbcTemplate.update("""
                delete from knowledge_bases
                where created_by in (
                    select id from users where username like 'stage12_%'
                )
                """);

        jdbcTemplate.update("""
                delete from user_rag_settings
                where user_id in (
                    select id from users where username like 'stage12_%'
                )
                """);

        jdbcTemplate.update("delete from users where username like 'stage12_%'");
    }

    @TestConfiguration
    static class Stage12ModelTestConfig {

        @Bean
        @Primary
        RecordingChatModelClient chatModelClient() {
            return new RecordingChatModelClient();
        }
    }

    static class RecordingChatModelClient implements ChatModelClient {
        private int callCount;

        @Override
        public synchronized String chat(String prompt, double temperature) {
            callCount++;
            return "stage12 model answer\n" + prompt;
        }

        synchronized int callCount() {
            return callCount;
        }

        synchronized void reset() {
            callCount = 0;
        }
    }
}
