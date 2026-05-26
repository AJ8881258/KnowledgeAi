package com.knowflow.backend.common.utils;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

public final class AuthUtils {
    private AuthUtils(){}

    /**
     * 获取当前用户ID
     * @param jwt
     * @return
     */
    public static Long getCurrentUserId(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
        }
        Number userId = jwt.getClaim("userId");
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing userId");
        }
        return userId.longValue();
    }

    /**
     * 用户名判断是否有效
     *
     * @param username
     * @return
     */
    public static String normalizeUsername(String username) {
        if (username == null || username.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username is null or empty");
        }
        return username.trim();
    }
}
