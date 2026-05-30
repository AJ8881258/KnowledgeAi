package com.knowflow.backend.document.service;

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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.stream.Collectors;

@Component
public class DocumentTextExtractor {

    /**
     * Extracts text from the uploaded MultipartFile path.
     *
     * @param file current upload request file; its original filename decides parser type
     * @return normalized plain text used by chunking
     */
    public String extract(MultipartFile file) {
        try {
            return extract(file.getOriginalFilename(), file.getBytes());
        } catch (IOException exception) {
            throw parseFailed("File reading failed");
        }
    }

    /**
     * Extracts text from persisted source bytes.
     *
     * <p>Stage 16 adds this overload so reprocess can retry from the original upload bytes instead of
     * rebuilding text from existing chunks. The filename extension is still the parser selector, so retry
     * preserves the same supported/unsupported file-type rules as the first upload.</p>
     *
     * @param filename original filename saved with the document, for example {@code guide.docx}
     * @param content raw source bytes saved at upload time
     * @return normalized plain text used by chunking and source_text persistence
     */
    public String extract(String filename, byte[] content) {
        byte[] safeContent = content == null ? new byte[0] : content;
        String extension = extensionOf(filename);

        return switch (extension) {
            case ".txt", ".md", ".markdown" -> readUtf8Text(safeContent);
            case ".pdf" -> readPdfText(safeContent);
            case ".docx" -> readDocxText(safeContent);
            case ".html", ".htm" -> readHtmlText(safeContent);
            // Stage 11 supports open XML .docx only; legacy .doc is a binary format outside this MVP.
            case ".doc" -> throw unsupported(extension);
            // OCR, PPT, and Excel need separate parsing strategies, so they stay out of this text-document stage.
            case ".ppt", ".pptx", ".xls", ".xlsx" -> throw unsupported(extension);
            default -> throw unsupported(extension);
        };
    }

    private String readUtf8Text(byte[] content) {
        return normalizeText(new String(content, StandardCharsets.UTF_8));
    }

    private String readPdfText(byte[] content) {
        try (PDDocument document = Loader.loadPDF(content)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return normalizeText(stripper.getText(document));
        } catch (IOException | RuntimeException exception) {
            throw parseFailed("PDF text extraction failed");
        }
    }

    private String readDocxText(byte[] content) {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(content))) {
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

    private String readHtmlText(byte[] content) {
        try {
            org.jsoup.nodes.Document html = Jsoup.parse(
                    new ByteArrayInputStream(content),
                    StandardCharsets.UTF_8.name(),
                    "");
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
        // Parser/library errors are collapsed to safe product messages, never paths or stack traces.
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
