package com.dhruv.auth.service;

import com.dhruv.auth.otp.OtpVerification;
import com.dhruv.auth.otp.OtpVerificationRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class OtpService {

    private static final int OTP_EXPIRATION_MINUTES = 5;

    private final OtpVerificationRepository otpRepository;

    private final SecureRandom secureRandom =
            new SecureRandom();

    public OtpService(
            OtpVerificationRepository otpRepository
    ) {
        this.otpRepository = otpRepository;
    }

    // =====================================================
    // GENERATE OTP
    // =====================================================

    @Transactional
    public String generateOtp(String email) {

        // Remove previous OTP
        otpRepository.deleteByEmail(email);

        // Generate secure 6-digit OTP
        String otp = String.format(
                "%06d",
                secureRandom.nextInt(1_000_000)
        );

        // OTP expires after 5 minutes
        LocalDateTime expiresAt =
                LocalDateTime.now()
                        .plusMinutes(
                                OTP_EXPIRATION_MINUTES
                        );

        OtpVerification verification =
                new OtpVerification(
                        email,
                        otp,
                        expiresAt
                );

        otpRepository.save(verification);

        return otp;
    }

    // =====================================================
    // VERIFY OTP
    // =====================================================

    @Transactional
    public boolean verifyOtp(
            String email,
            String otp
    ) {

        OtpVerification verification =
                otpRepository
                        .findTopByEmailOrderByCreatedAtDesc(
                                email
                        )
                        .orElse(null);

        // OTP doesn't exist
        if (verification == null) {
            return false;
        }

        // OTP already used
        if (verification.isVerified()) {
            return false;
        }

        // OTP expired
        if (
                LocalDateTime.now()
                        .isAfter(
                                verification.getExpiresAt()
                        )
        ) {

            otpRepository.delete(verification);

            return false;
        }

        // OTP doesn't match
        if (!verification.getOtp().equals(otp)) {
            return false;
        }

        // Mark OTP as verified
        verification.setVerified(true);

        otpRepository.save(verification);

        return true;
    }
}
