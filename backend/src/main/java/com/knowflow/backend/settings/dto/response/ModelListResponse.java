package com.knowflow.backend.settings.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModelListResponse {
    private List<ModelItem> models;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ModelItem {
        private String id;
        private String name;
    }
}
