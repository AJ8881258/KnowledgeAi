package com.knowflow.backend.document.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DocumentProcessingJobRunner {
    private final DocumentProcessingJobService jobService;
    private final DocumentProcessingAsyncWorker asyncWorker;
    private final boolean asyncEnabled;

    public DocumentProcessingJobRunner(
            DocumentProcessingJobService jobService,
            DocumentProcessingAsyncWorker asyncWorker,
            @Value("${knowflow.documents.processing.async-enabled:false}") boolean asyncEnabled) {
        this.jobService = jobService;
        this.asyncWorker = asyncWorker;
        this.asyncEnabled = asyncEnabled;
    }

    /**
     * Starts a durable document processing job.
     *
     * @param jobId job row ID created before this method is called
     * @Desc Tests keep async disabled by default for deterministic old-stage assertions. Local/product
     * runtime can set knowflow.documents.processing.async-enabled=true so the request returns while
     * parsing and chunk writes continue in a background Spring async task.
     */
    public void start(Long jobId) {
        if (asyncEnabled) {
            asyncWorker.runAsync(jobId);
            return;
        }
        jobService.processJob(jobId);
    }
}
