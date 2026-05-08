package com.knowflow.backend.auth;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.knowflow.backend.user.User;
import com.knowflow.backend.user.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Username || Password is incorrect"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Username || Password is incorrect");
        }
        return new LoginResponse(user.getId(), user.getUsername(), user.getRole());
    }

    @PostMapping("/register")
    public LoginResponse register(@RequestBody RegisterRequest request) {
        String username = request.getUsername();
        String password = request.getPassword();

        if (username == null || username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is Null");
        }
        if (password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password is Null");
        }
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is exist");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole("USER");
        User savedUser = userRepository.save(user);
        return new LoginResponse(savedUser.getId(), savedUser.getUsername(), savedUser.getRole());
    }

}
