package com.knowflow.backend.document.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class DocumentProcessingAsyncWorker {
    private final DocumentProcessingJobService jobService;

    public DocumentProcessingAsyncWorker(DocumentProcessingJobService jobService) {
        this.jobService = jobService;
    }

    /**
     * Executes one document processing job on Spring's async executor.
     *
     * @param jobId durable document_processing_jobs ID created before the request returns
     * @Desc This method lives in a separate Spring bean because @Async only works through the Spring
     * proxy. Calling an @Async method on the same class would silently run synchronously, which would
     * defeat Stage 17's background-processing behavior.
     */
    @Async
    public void runAsync(Long jobId) {
        jobService.processJob(jobId);
    }
}
