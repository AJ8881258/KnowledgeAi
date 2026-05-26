package com.knowflow.backend.document.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.stream.Collectors;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class DocumentTextExtractor {


    // 入口 -- 提取文档文本
    public String extract(MultipartFile file) {
        String extension = extensionOf(file.getOriginalFilename());

        return switch (extension) {
            case ".txt", ".md", ".markdown" -> readUtf8Text(file);
            case ".pdf" -> readPdfText(file);
            case ".docx" -> readDocxText(file);
            case ".html", ".htm" -> readHtmlText(file);
            // Stage 11 supports open XML .docx only; legacy .doc is a binary format outside this MVP.
            case ".doc" -> throw unsupported(extension);
            // OCR, PPT, and Excel need separate parsing strategies, so they stay out of this text-document stage.
            case ".ppt", ".pptx", ".xls", ".xlsx" -> throw unsupported(extension);
            default -> throw unsupported(extension);
        };
    }


    // 内部 -- 读取UTF-8文本文件
    private String readUtf8Text(MultipartFile file) {
        try {
            return normalizeText(new String(file.getBytes(), StandardCharsets.UTF_8));
        } catch (IOException exception) {
            throw parseFailed("Text file reading failed");
        }
    }


    // 内部 -- 读取PDF文件
    private String readPdfText(MultipartFile file) {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return normalizeText(stripper.getText(document));
        } catch (IOException | RuntimeException exception) {
            throw parseFailed("PDF text extraction failed");
        }
    }

    // 内部 -- 读取DOCX文件
    private String readDocxText(MultipartFile file) {
        try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
            StringBuilder text = new StringBuilder();

            // 读取段落文本
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                appendLine(text, paragraph.getText());
            }

            // 读取表格文本
            for (XWPFTable table : document.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        appendLine(text, cell.getText());
                    }
                }
            }

            return normalizeText(text.toString());
        } catch (IOException | RuntimeException exception) {
            throw parseFailed("DOCX text extraction failed");
        }
    }

    // 内部 -- 读取HTML文件
    private String readHtmlText(MultipartFile file) {
        try {
            org.jsoup.nodes.Document html = Jsoup.parse(file.getInputStream(), StandardCharsets.UTF_8.name(), "");
            // 移除标签
            html.select("script, style, noscript, template").remove();

            Element body = html.body();
            String visibleText = body == null ? html.text() : body.text();
            return normalizeText(visibleText);
        } catch (IOException | RuntimeException exception) {
            throw parseFailed("HTML text extraction failed");
        }
    }

    private void appendLine(StringBuilder builder, String value) {
        if (value == null || value.trim().isBlank()) {
            return;
        }
        if (!builder.isEmpty()) {
            builder.append("\n");
        }
        builder.append(value.trim());
    }

    // 内部 -- 规范文本格式
    private String normalizeText(String text) {
        if (text == null) {
            return "";
        }
        // 替换不间断空格为普通空格
        return text.replace("\u00A0", " ")
                .lines()//按行分割
                .map(String::trim)//去除首位空格
                .filter(line -> !line.isBlank())//过滤空行
                .collect(Collectors.joining("\n"));//合并为字符串
    }

    // 内部 -- 提取文件扩展名
    private String extensionOf(String filename) {
        if (filename == null || filename.isBlank()) {
            return "";
        }
        String normalized = filename.trim().toLowerCase(Locale.ROOT);
        int dotIndex = normalized.lastIndexOf(".");
        if (dotIndex < 0 || dotIndex == normalized.length() - 1) {
            return "";
        }
        return normalized.substring(dotIndex);
    }


    //不支持错误
    private ExtractionFailure unsupported(String extension) {
        String suffix = extension == null || extension.isBlank() ? "" : ": " + extension;
        return new ExtractionFailure(HttpStatus.BAD_REQUEST, "Unsupported file type" + suffix);
    }

    // 解析失败
    private ExtractionFailure parseFailed(String message) {
        // Parse failures return sanitized business messages, not paths, stack traces, or library internals.
        return new ExtractionFailure(HttpStatus.BAD_REQUEST, message);
    }


    //异常处理，
    public static class ExtractionFailure extends RuntimeException {
        private final HttpStatus status;
        private final String userMessage;

        public ExtractionFailure(HttpStatus status, String userMessage) {
            super(userMessage);
            this.status = status;
            this.userMessage = userMessage;
        }

        public HttpStatus getStatus() {
            return status;
        }

        public String getUserMessage() {
            return userMessage;
        }
    }
}
