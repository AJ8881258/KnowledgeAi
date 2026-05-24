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

    private String readUtf8Text(MultipartFile file) {
        try {
            return normalizeText(new String(file.getBytes(), StandardCharsets.UTF_8));
        } catch (IOException exception) {
            throw parseFailed("Text file reading failed");
        }
    }

    private String readPdfText(MultipartFile file) {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return normalizeText(stripper.getText(document));
        } catch (IOException | RuntimeException exception) {
            throw parseFailed("PDF text extraction failed");
        }
    }

    private String readDocxText(MultipartFile file) {
        try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
            StringBuilder text = new StringBuilder();

            for (XWPFParagraph paragraph : document.getParagraphs()) {
                appendLine(text, paragraph.getText());
            }

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

    private String readHtmlText(MultipartFile file) {
        try {
            org.jsoup.nodes.Document html = Jsoup.parse(file.getInputStream(), StandardCharsets.UTF_8.name(), "");
            // script/style/noscript/template are not visible body text and would pollute search/RAG chunks.
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

    private String normalizeText(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\u00A0", " ")
                .lines()
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .collect(Collectors.joining("\n"));
    }

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

    private ExtractionFailure unsupported(String extension) {
        String suffix = extension == null || extension.isBlank() ? "" : ": " + extension;
        return new ExtractionFailure(HttpStatus.BAD_REQUEST, "Unsupported file type" + suffix);
    }

    private ExtractionFailure parseFailed(String message) {
        // Parse failures return sanitized business messages, not paths, stack traces, or library internals.
        return new ExtractionFailure(HttpStatus.BAD_REQUEST, message);
    }

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
