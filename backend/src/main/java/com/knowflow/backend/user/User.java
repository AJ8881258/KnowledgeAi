package com.knowflow.backend.user;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {
    @Id
    // 自动生成主键
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false,length = 64,unique =true )
    private String username;

    @Column(nullable = false,length = 255)
    private String passwordHash;

    @Column(nullable = false,length = 32)
    private String role;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    // Getter
    public Long getId() {
        return id;
    }
    public String getUsername() {
        return username;
    }
    public String getPasswordHash() {
        return passwordHash;
    }
    public String getRole() {
        return role;
    }
    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    // Setter
    public void setUsername(String username) {
        this.username = username;
    }
    public void setPasswordHash(String password){
        this.passwordHash = password;
    }
    public void setRole(String role){
        this.role = role;
    }

    // 创建时自动设置时间
    @PrePersist
    void onCreate(){
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    // 更新时自动设置时间
    @PreUpdate
    void onUpdate(){
        updatedAt = OffsetDateTime.now();
    }
}
