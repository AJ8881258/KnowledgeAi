package com.knowflow.backend;

import com.knowflow.backend.auth.avatar.AvatarStorageService;
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
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

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
        classes = {
                KnowflowBackendApplication.class,
                Stage22DefaultAvatarTests.FakeAvatarStorageConfiguration.class
        },
        properties = {
                "knowflow.ai.base-url=http://127.0.0.1:1/v1",
                "knowflow.ai.api-key=stage22-env-key",
                "knowflow.ai.model=stage22-env-model",
                "knowflow.jwt.secret=stage22-jwt-secret-key-with-at-least-32-bytes",
                "knowflow.model.secret-key=stage22-test-secret-key-with-32-bytes"
        }
)
@AutoConfigureMockMvc
class Stage22DefaultAvatarTests {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private FakeAvatarStorageService fakeAvatarStorageService;

    private final String password = "stage22-password";

    @BeforeEach
    void cleanBefore() {
        cleanStage22Data();
        fakeAvatarStorageService.reset();
    }

    @AfterEach
    void cleanAfter() {
        fakeAvatarStorageService.reset();
        cleanStage22Data();
    }

    @Test
    void avatarPresetCanBeSelectedAndRejectsUnknownPreset() throws Exception {
        createUser("stage22_avatar_preset_owner");
        String token = loginAndGetToken("stage22_avatar_preset_owner");

        mockMvc.perform(patch("/api/auth/me/avatar-preset")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarPresetId\":\"blue\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfigured").value(true))
                .andExpect(jsonPath("$.avatarSource").value("PRESET"))
                .andExpect(jsonPath("$.avatarPresetId").value("blue"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist())
                .andExpect(content().string(not(containsString("object-key"))))
                .andExpect(content().string(not(containsString("stage22-avatar-secret"))));

        assertThat(readAvatarPresetId("stage22_avatar_preset_owner")).isEqualTo("blue");
        assertThat(readAvatarObjectKey("stage22_avatar_preset_owner")).isNull();

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfigured").value(true))
                .andExpect(jsonPath("$.avatarSource").value("PRESET"))
                .andExpect(jsonPath("$.avatarPresetId").value("blue"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist())
                .andExpect(content().string(not(containsString("object-key"))));

        mockMvc.perform(patch("/api/auth/me/avatar-preset")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarPresetId\":\"unknown\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void avatarUploadClearsPresetAndPresetSelectionClearsObjectKey() throws Exception {
        createUser("stage22_avatar_switch_owner");
        String token = loginAndGetToken("stage22_avatar_switch_owner");

        mockMvc.perform(patch("/api/auth/me/avatar-preset")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarPresetId\":\"rose\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarSource").value("PRESET"))
                .andExpect(jsonPath("$.avatarPresetId").value("rose"));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.webp",
                "image/webp",
                new byte[]{0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50}
        );
        mockMvc.perform(multipart("/api/auth/me/avatar")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfigured").value(true))
                .andExpect(jsonPath("$.avatarSource").value("UPLOAD"))
                .andExpect(jsonPath("$.avatarPresetId").doesNotExist())
                .andExpect(jsonPath("$.avatarUrl").value(containsString("https://signed.example.test/")));

        String uploadedObjectKey = readAvatarObjectKey("stage22_avatar_switch_owner");
        assertThat(uploadedObjectKey).contains("object-key");
        assertThat(readAvatarPresetId("stage22_avatar_switch_owner")).isNull();

        mockMvc.perform(patch("/api/auth/me/avatar-preset")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarPresetId\":\"amber\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfigured").value(true))
                .andExpect(jsonPath("$.avatarSource").value("PRESET"))
                .andExpect(jsonPath("$.avatarPresetId").value("amber"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist())
                .andExpect(content().string(not(containsString("object-key"))));

        assertThat(readAvatarObjectKey("stage22_avatar_switch_owner")).isNull();
        assertThat(readAvatarPresetId("stage22_avatar_switch_owner")).isEqualTo("amber");
        assertThat(fakeAvatarStorageService.deletedObjectKeys()).contains(uploadedObjectKey);

        mockMvc.perform(delete("/api/auth/me/avatar")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarConfigured").value(false))
                .andExpect(jsonPath("$.avatarSource").value("NONE"))
                .andExpect(jsonPath("$.avatarPresetId").doesNotExist())
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());

        assertThat(readAvatarObjectKey("stage22_avatar_switch_owner")).isNull();
        assertThat(readAvatarPresetId("stage22_avatar_switch_owner")).isNull();
    }

    @Test
    void currentUserProfileCanUpdateUsernameWithoutSensitiveLeak() throws Exception {
        createUser("stage22_profile_username_owner");
        String token = loginAndGetToken("stage22_profile_username_owner");

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "  stage22_profile_renamed  "
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("stage22_profile_renamed"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(content().string(not(containsString("password_hash"))))
                .andExpect(content().string(not(containsString("Authorization"))))
                .andExpect(content().string(not(containsString("object-key"))))
                .andExpect(content().string(not(containsString("stage22-test-secret-key"))))
                .andExpect(content().string(not(containsString("stage22-avatar-secret"))));

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("stage22_profile_renamed"))
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    void currentUserProfileCanUpdateEmailWithoutChangingUsername() throws Exception {
        createUser("stage22_profile_email_owner");
        String token = loginAndGetToken("stage22_profile_email_owner");

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"Stage22_Profile@Example.COM\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("stage22_profile_email_owner"))
                .andExpect(jsonPath("$.email").value("stage22_profile@example.com"))
                .andExpect(content().string(not(containsString("password_hash"))))
                .andExpect(content().string(not(containsString("Authorization"))))
                .andExpect(content().string(not(containsString("object-key"))))
                .andExpect(content().string(not(containsString("stage22-test-secret-key"))))
                .andExpect(content().string(not(containsString("stage22-avatar-secret"))));
    }

    @Test
    void currentUserProfileCanClearEmailWithoutChangingUsername() throws Exception {
        createUserWithEmail("stage22_profile_clear_email_owner", "clear-me@example.com");
        String token = loginAndGetToken("stage22_profile_clear_email_owner");

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("stage22_profile_clear_email_owner"))
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    void currentUserProfileRejectsBlankAndDuplicateUsername() throws Exception {
        createUser("stage22_profile_duplicate");
        createUser("stage22_profile_conflict");
        String token = loginAndGetToken("stage22_profile_duplicate");

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"   \"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + "x".repeat(101) + "\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"stage22_profile_conflict\"}"))
                .andExpect(status().isConflict())
                .andExpect(content().string(not(containsString("password_hash"))))
                .andExpect(content().string(not(containsString("Authorization"))));
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
                                      avatar_object_key = null,
                                      avatar_preset_id = null,
                                      updated_at = now()
                        returning id
                        """,
                Long.class,
                username,
                passwordEncoder.encode(password));
    }

    private Long createUserWithEmail(String username, String email) {
        Long userId = createUser(username);
        jdbcTemplate.update("update users set email = ? where id = ?", email, userId);
        return userId;
    }

    private String readAvatarObjectKey(String username) {
        return jdbcTemplate.queryForObject(
                "select avatar_object_key from users where username = ?",
                String.class,
                username);
    }

    private String readAvatarPresetId(String username) {
        return jdbcTemplate.queryForObject(
                "select avatar_preset_id from users where username = ?",
                String.class,
                username);
    }

    private void cleanStage22Data() {
        jdbcTemplate.update("delete from users where username like 'stage22_%'");
    }

    @TestConfiguration
    static class FakeAvatarStorageConfiguration {
        @Bean
        @Primary
        FakeAvatarStorageService fakeAvatarStorageService() {
            return new FakeAvatarStorageService();
        }
    }

    static class FakeAvatarStorageService implements AvatarStorageService {
        private final List<String> deletedObjectKeys = new CopyOnWriteArrayList<>();
        private volatile int uploadSequence = 0;

        @Override
        public String upload(Long userId, MultipartFile file) {
            validateFile(file);
            uploadSequence += 1;
            return "knowflow/avatars/%d/object-key-%d.webp".formatted(userId, uploadSequence);
        }

        @Override
        public void delete(String objectKey) {
            if (objectKey != null) {
                deletedObjectKeys.add(objectKey);
            }
        }

        @Override
        public String createSignedUrl(String objectKey) {
            return objectKey == null ? null : "https://signed.example.test/avatar-token-" + Math.abs(objectKey.hashCode());
        }

        @Override
        public boolean isConfigured() {
            return true;
        }

        void reset() {
            deletedObjectKeys.clear();
            uploadSequence = 0;
        }

        List<String> deletedObjectKeys() {
            return deletedObjectKeys;
        }

        private void validateFile(MultipartFile file) {
            if (file == null || file.isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "avatar file is required");
            }
            if (file.getSize() > 2L * 1024L * 1024L) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "avatar file is too large");
            }
            String contentType = file.getContentType();
            try {
                byte[] header = file.getInputStream().readNBytes(12);
                boolean valid = "image/webp".equals(contentType)
                        && header.length >= 12
                        && header[0] == 0x52
                        && header[1] == 0x49
                        && header[2] == 0x46
                        && header[3] == 0x46
                        && header[8] == 0x57
                        && header[9] == 0x45
                        && header[10] == 0x42
                        && header[11] == 0x50;
                if (!valid) {
                    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "avatar file type is not supported");
                }
            } catch (IOException exception) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "avatar file type is not supported");
            }
        }
    }
}
