package com.knowflow.backend.auth.dto.request;

import lombok.Data;

@Data
public class LoginRequest {

    // Private
    private String username;
    private String password;

    // // Getter
    // public String getUsername() {
    //     return username;
    // }

    // public String getPassword() {
    //     return password;
    // }

}
