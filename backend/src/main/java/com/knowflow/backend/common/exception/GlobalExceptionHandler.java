package com.knowflow.backend.common.exception;

import com.knowflow.backend.common.dto.response.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * @Method RestControllerAdvice
 * @Des 全局异常拦截器
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * @param exception
     * @return
     * @Method ExceptionHandler
     * @Des 处理ResponseStatusException异常
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatusException(ResponseStatusException exception) {
        return ResponseEntity
                .status(exception.getStatusCode())
                .body(new ApiErrorResponse(resolveMessage(exception)));
    }


    @ExceptionHandler({
            HttpMessageNotReadableException.class,       // 请求体 JSON 格式错误
            MissingServletRequestPartException.class,
            MissingServletRequestParameterException.class, // 缺少必传参数
            MethodArgumentTypeMismatchException.class,     // 参数类型不对（如要数字传了字符串）
            MultipartException.class                       // 文件上传格式问题
    })
    public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse("Bad request"));
    }


    /**
     * @Desc 兜底捕获
     * @param exception
     * @return
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception) {
        // 统一兜底错误响应，避免把数据库、模型供应商、base URL 等内部异常细节直接返回给前端。
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiErrorResponse("Internal server error"));
    }

    /**
     * @Desc 解析异常消息
     * @param exception
     * @return
     */
    private String resolveMessage(ResponseStatusException exception) {
        if (exception.getReason() != null && !exception.getReason().isBlank()) {
            return exception.getReason();          // 有自定义消息就用它
        }
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        return status == null ? "Request failed" : status.getReasonPhrase();
        //                     ↑ 状态码解析不出来        ↑ 用标准短语如 "Not Found"
    }
}
