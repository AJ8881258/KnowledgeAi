package com.knowflow.backend.common.utils;

import org.springframework.stereotype.Service;

public class Utils {
    /**
     * 检查字符串是否包含非空白字符
     * @param value
     * @return
     */
    public static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
