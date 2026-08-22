package com.dhruv.auth.controller;

import com.dhruv.auth.entity.User;
import com.dhruv.auth.service.JwtService;
import com.dhruv.auth.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserService userService,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {

        try {
            User savedUser = userService.registerUser(user);

            // Never return the password
            savedUser.setPassword(null);

            return ResponseEntity.ok(savedUser);

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {

        User existingUser =
                userService.findByEmail(user.getEmail());

        // User not found
        if (existingUser == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Invalid email or password");
        }

        // Password verification
        boolean passwordMatches =
                passwordEncoder.matches(
                        user.getPassword(),
                        existingUser.getPassword()
                );

        if (!passwordMatches) {
            return ResponseEntity
                    .badRequest()
                    .body("Invalid email or password");
        }

        // Generate JWT token
        String token =
                jwtService.generateToken(existingUser.getEmail());

        // Don't expose password
        existingUser.setPassword(null);

        // Return token + user
        return ResponseEntity.ok(
                Map.of(
                        "message", "Login successful",
                        "token", token,
                        "user", existingUser
                )
        );
    }
}