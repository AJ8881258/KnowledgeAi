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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage23-env-key",
                "knowflow.ai.model=stage23-env-model",
                "knowflow.jwt.secret=stage23-jwt-secret-key-with-at-least-32-bytes",
                "knowflow.model.secret-key=stage23-test-secret-key-with-32-bytes"
        }
)
@AutoConfigureMockMvc
class Stage23ProfileContactTests {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String password = "stage23-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage23Data();
    }

    @AfterEach
    void cleanAfter() {
        cleanStage23Data();
    }

    @Test
    void currentUserProfileCanSetReturnAndClearPhone() throws Exception {
        createUser("stage23_phone_owner");
        String token = loginAndGetToken("stage23_phone_owner");

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"  +86 (021) 1234-5678  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("+86 (021) 1234-5678"))
                .andExpect(jsonPath("$.avatarStorageConfigured").value(false))
                .andExpect(content().string(not(containsString("AccessKey"))))
                .andExpect(content().string(not(containsString("Authorization"))));

        assertThat(readPhone("stage23_phone_owner")).isEqualTo("+86 (021) 1234-5678");

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("+86 (021) 1234-5678"))
                .andExpect(jsonPath("$.avatarStorageConfigured").value(false));

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").doesNotExist());

        assertThat(readPhone("stage23_phone_owner")).isNull();

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"   \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").doesNotExist());
    }

    @Test
    void currentUserProfileRejectsInvalidPhoneAndKeepsOtherProfileFields() throws Exception {
        createUser("stage23_phone_invalid_owner");
        String token = loginAndGetToken("stage23_phone_invalid_owner");

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"abcde\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"1234\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"123456789012345678901234567890123\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"138 0000 0000\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("stage23_phone_invalid_owner"))
                .andExpect(jsonPath("$.phone").value("138 0000 0000"));
    }

    @Test
    void avatarUploadWithoutOssConfigurationReturnsSanitizedChineseMessageWhilePresetStillWorks() throws Exception {
        createUser("stage23_avatar_storage_owner");
        String token = loginAndGetToken("stage23_avatar_storage_owner");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.webp",
                "image/webp",
                new byte[]{0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50}
        );

        mockMvc.perform(multipart("/api/auth/me/avatar")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("头像上传需要先配置 OSS 存储。")))
                .andExpect(content().string(not(containsString("stage23-env-key"))))
                .andExpect(content().string(not(containsString("AccessKey"))))
                .andExpect(content().string(not(containsString("Secret"))))
                .andExpect(content().string(not(containsString("Authorization"))));

        mockMvc.perform(patch("/api/auth/me/avatar-preset")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarPresetId\":\"green\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarStorageConfigured").value(false))
                .andExpect(jsonPath("$.avatarConfigured").value(true))
                .andExpect(jsonPath("$.avatarSource").value("PRESET"))
                .andExpect(jsonPath("$.avatarPresetId").value("green"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());
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

    private Long createUser(String username) {
        return jdbcTemplate.queryForObject("""
                        insert into users (username, password_hash, role)
                        values (?, ?, 'USER')
                        on conflict (username)
                        do update set password_hash = excluded.password_hash,
                                      role = excluded.role,
                                      email = null,
                                      phone = null,
                                      avatar_object_key = null,
                                      avatar_preset_id = null,
                                      updated_at = now()
                        returning id
                        """,
                Long.class,
                username,
                passwordEncoder.encode(password));
    }

    private String readPhone(String username) {
        return jdbcTemplate.queryForObject(
                "select phone from users where username = ?",
                String.class,
                username);
    }

    private void cleanStage23Data() {
        jdbcTemplate.update("delete from users where username like 'stage23_%'");
    }
}
