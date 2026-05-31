package com.knowflow.backend.auth.controller;

import com.knowflow.backend.auth.dto.request.RegisterRequest;
import com.knowflow.backend.auth.dto.request.ResetPasswordRequest;
import com.knowflow.backend.auth.dto.request.UpdateCurrentUserRequest;
import com.knowflow.backend.auth.dto.response.LoginResponse;
import com.knowflow.backend.auth.dto.request.LoginRequest;
import com.knowflow.backend.auth.dto.response.UserResponse;
import com.knowflow.backend.auth.service.AuthService;
import com.knowflow.backend.auth.service.JwtTokenService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import com.knowflow.backend.common.dto.response.MessageResponse;
import com.knowflow.backend.user.entity.User;
import com.knowflow.backend.user.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 认证控制器
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final AuthService authService;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            AuthService authService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.authService = authService;


    }

    /**
     * @param jwt
     * @return
     * @Desc 获取当前用户信息
     */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return authService.getCurrentUser(getCurrentId(jwt));
    }

    /**
     * @param request
     * @param jwt
     * @return
     * @Desc 更新当前用户信息
     */
    @PatchMapping("/me")
    public UserResponse updateMe(
            @RequestBody(required = false) UpdateCurrentUserRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return authService.updateCurrentUser(getCurrentId(jwt), request);
    }

    /**
     * @param file multipart 字段名 file，支持 jpeg/png/webp，最大 2MB
     * @param jwt 当前登录用户
     * @return 更新后的用户资料；avatarUrl 是短期签名 URL，不是 OSS object key
     * @Desc 头像上传使用后端 OSS 配置，前端不会接触 AccessKey、bucket 或 object key。
     */
    @PostMapping("/me/avatar")
    public UserResponse uploadAvatar(
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return authService.uploadAvatar(getCurrentId(jwt), file);
    }

    /**
     * @param jwt 当前登录用户
     * @return 清空头像后的用户资料
     * @Desc 删除头像只影响当前用户自己的头像 object key，并尽力删除 OSS 对象。
     */
    @DeleteMapping("/me/avatar")
    public UserResponse deleteAvatar(@AuthenticationPrincipal Jwt jwt) {
        return authService.deleteAvatar(getCurrentId(jwt));
    }

    /**
     * @param jwt
     * @Desc 删除当前用户账号，
     * 包括所有关联的会话、消息、引用来源、文档和 chunks、知识库
     */
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMe(
            @AuthenticationPrincipal Jwt jwt
    ) {
        authService.deleteCurrentUser(getCurrentId(jwt));
    }


    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        String username = getRequiredText(request == null ? null : request.getUsername(), "username is required");
        String password = getRequiredText(request == null ? null : request.getPassword(), "password is required");


        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "用户名或密码不正确"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码不正确");
        }

        String accessToken = jwtTokenService.generateToken(user);
        return new LoginResponse(user.getId(), user.getUsername(), user.getRole(), "Bearer", accessToken);
    }

    @PostMapping("/register")
    public UserResponse register(@RequestBody RegisterRequest request) {
        String username = request.getUsername();
        String password = request.getPassword();

        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is Null");
        }
        if (password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password is Null");
        }
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is exist");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole("USER");
        userRepository.save(user);


        return new UserResponse(user.getId(), user.getUsername(), user.getRole(), user.getEmail());
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@RequestBody ResetPasswordRequest request) {
        String username = request.getUsername();
        String newPassword = request.getNewPassword();

        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is Null");
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "newPassword is Null");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Username not found"));

        String encodedPassword = passwordEncoder.encode(newPassword);
        int updateRows = userRepository.updatePasswordByUsername(user.getUsername(), encodedPassword);

        if (updateRows != 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Reset password failed");
        }
        return new MessageResponse("密码修改成功");
    }


    /**
     * 从JWT中获取当前用户ID
     *
     * @param jwt
     * @return
     */
    private Long getCurrentId(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Must be Login");
        }
        Number userId = jwt.getClaim("userId");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "userId is Null");
        }
        return userId.longValue();
    }

    /**
     * 获取必填文本
     *
     * @param value
     * @param message
     * @return
     */
    private String getRequiredText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }
}
