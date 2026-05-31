package com.knowflow.backend;

import com.knowflow.backend.document.service.DocumentProcessingAsyncWorker;
import com.knowflow.backend.document.service.DocumentProcessingJobRunner;
import com.knowflow.backend.document.service.DocumentProcessingJobService;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class DocumentProcessingJobRunnerTests {

    @Test
    void startUsesAsyncWorkerWhenAsyncProcessingIsEnabled() {
        DocumentProcessingJobService jobService = mock(DocumentProcessingJobService.class);
        DocumentProcessingAsyncWorker asyncWorker = mock(DocumentProcessingAsyncWorker.class);
        DocumentProcessingJobRunner runner = new DocumentProcessingJobRunner(jobService, asyncWorker, true);

        runner.start(42L);

        verify(asyncWorker).runAsync(42L);
        verifyNoInteractions(jobService);
    }

    @Test
    void startRunsSynchronouslyWhenAsyncProcessingIsDisabled() {
        DocumentProcessingJobService jobService = mock(DocumentProcessingJobService.class);
        DocumentProcessingAsyncWorker asyncWorker = mock(DocumentProcessingAsyncWorker.class);
        DocumentProcessingJobRunner runner = new DocumentProcessingJobRunner(jobService, asyncWorker, false);

        runner.start(43L);

        verify(jobService).processJob(43L);
        verifyNoInteractions(asyncWorker);
    }
}
