package com.dhruv.auth.controller;

import com.dhruv.auth.entity.User;
import com.dhruv.auth.service.EmailService;
import com.dhruv.auth.service.JwtService;
import com.dhruv.auth.service.OtpService;
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
    private final OtpService otpService;
    private final EmailService emailService;

    public AuthController(
            UserService userService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            OtpService otpService,
            EmailService emailService
    ) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @RequestBody User user
    ) {

        try {

            User savedUser =
                    userService.registerUser(user);

            // Generate OTP
            String otp =
                    otpService.generateOtp(
                            savedUser.getEmail()
                    );

            // Send OTP to user's email
            emailService.sendOtpEmail(
                    savedUser.getEmail(),
                    otp
            );

            // Never return password
            savedUser.setPassword(null);

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Registration successful. OTP sent to your email.",
                            "user",
                            savedUser
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody User user
    ) {

        User existingUser =
                userService.findByEmail(user.getEmail());

        // User not found
        if (existingUser == null) {

            return ResponseEntity
                    .badRequest()
                    .body("Invalid email or password");
        }

        // Email verification check
        if (!existingUser.isEmailVerified()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Please verify your email before logging in"
                    );
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

        // Generate JWT
        String token =
                jwtService.generateToken(
                        existingUser.getEmail()
                );

        // Never expose password
        existingUser.setPassword(null);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Login successful",
                        "token",
                        token,
                        "user",
                        existingUser
                )
        );
    }
}