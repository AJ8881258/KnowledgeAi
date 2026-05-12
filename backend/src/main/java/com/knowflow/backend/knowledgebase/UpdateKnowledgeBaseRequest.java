package com.knowflow.backend.knowledgebase;

public class UpdateKnowledgeBaseRequest {

    private String name;
    private String description;
    private Boolean featured;
    private String themeId;

    // Getter & Setter
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getFeatured() {
        return featured;
    }

    public String getThemeId() {
        return themeId;
    }

    public void setFeatured(Boolean featured) {
        this.featured = featured;
    }

    public void setThemeId(String themeId) {
        this.themeId = themeId;
    }
}
