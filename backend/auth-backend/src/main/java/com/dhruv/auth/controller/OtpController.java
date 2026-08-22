package com.dhruv.auth.controller;

import com.dhruv.auth.entity.User;
import com.dhruv.auth.service.EmailService;
import com.dhruv.auth.service.OtpService;
import com.dhruv.auth.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class OtpController {

    private final OtpService otpService;
    private final EmailService emailService;
    private final UserService userService;

    public OtpController(
            OtpService otpService,
            EmailService emailService,
            UserService userService
    ) {
        this.otpService = otpService;
        this.emailService = emailService;
        this.userService = userService;
    }

    // =====================================================
    // SEND OTP FOR EMAIL VERIFICATION
    // =====================================================

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(
            @RequestBody Map<String, String> request
    ) {

        String email = request.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("Email is required");
        }

        User user = userService.findByEmail(email);

        if (user == null) {
            return ResponseEntity
                    .badRequest()
                    .body("User not found");
        }

        if (user.isEmailVerified()) {
            return ResponseEntity
                    .badRequest()
                    .body("Email is already verified");
        }

        String otp = otpService.generateOtp(email);

        emailService.sendOtpEmail(email, otp);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "OTP sent successfully"
                )
        );
    }

    // =====================================================
    // VERIFY EMAIL OTP
    // =====================================================

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @RequestBody Map<String, String> request
    ) {

        String email = request.get("email");
        String otp = request.get("otp");

        if (email == null || email.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("Email is required");
        }

        if (otp == null || otp.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("OTP is required");
        }

        boolean valid = otpService.verifyOtp(email, otp);

        if (!valid) {
            return ResponseEntity
                    .badRequest()
                    .body("Invalid or expired OTP");
        }

        User user = userService.findByEmail(email);

        if (user == null) {
            return ResponseEntity
                    .badRequest()
                    .body("User not found");
        }

        user.setEmailVerified(true);

        userService.saveUser(user);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Email verified successfully"
                )
        );
    }

    // =====================================================
    // FORGOT PASSWORD - SEND OTP
    // =====================================================

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @RequestBody Map<String, String> request
    ) {

        String email = request.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("Email is required");
        }

        User user = userService.findByEmail(email);

        if (user == null) {
            return ResponseEntity
                    .badRequest()
                    .body("No account found with this email");
        }

        String otp = otpService.generateOtp(email);

        emailService.sendOtpEmail(email, otp);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Password reset OTP sent successfully"
                )
        );
    }

    // =====================================================
    // RESET PASSWORD USING OTP
    // =====================================================

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @RequestBody Map<String, String> request
    ) {

        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        // Validate email
        if (email == null || email.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("Email is required");
        }

        // Validate OTP
        if (otp == null || otp.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("OTP is required");
        }

        // Validate password
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("New password is required");
        }

        if (newPassword.length() < 8) {
            return ResponseEntity
                    .badRequest()
                    .body("Password must be at least 8 characters");
        }

        // Find user
        User user = userService.findByEmail(email);

        if (user == null) {
            return ResponseEntity
                    .badRequest()
                    .body("User not found");
        }

        // Verify OTP
        boolean valid = otpService.verifyOtp(
                email,
                otp
        );

        if (!valid) {
            return ResponseEntity
                    .badRequest()
                    .body("Invalid or expired OTP");
        }

        // Update password
        userService.updatePassword(
                email,
                newPassword
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Password reset successfully"
                )
        );
    }
}