package com.knowflow.backend.auth.dto.request;

public class UpdateCurrentUserRequest {
    private String username;
    private String email;
    private String phone;
    private boolean usernamePresent;
    private boolean emailPresent;
    private boolean phonePresent;

    public String getUsername() {
        return username;
    }

    /**
     * Jackson invokes this setter only when the username property is present in JSON.
     * The presence flag lets AuthService distinguish "keep current username" from
     * "validate this submitted username".
     */
    public void setUsername(String username) {
        this.username = username;
        this.usernamePresent = true;
    }

    public String getEmail() {
        return email;
    }

    /**
     * Explicit null means "clear email", while an absent email property means
     * "leave existing email unchanged".
     */
    public void setEmail(String email) {
        this.email = email;
        this.emailPresent = true;
    }

    public boolean isUsernamePresent() {
        return usernamePresent;
    }

    public boolean isEmailPresent() {
        return emailPresent;
    }

    public String getPhone() {
        return phone;
    }

    /**
     * Explicit null or blank means "clear phone", while an absent phone property
     * means "leave the saved contact phone unchanged".
     */
    public void setPhone(String phone) {
        this.phone = phone;
        this.phonePresent = true;
    }

    public boolean isPhonePresent() {
        return phonePresent;
    }
}
