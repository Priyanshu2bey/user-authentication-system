package com.dhruv.auth.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String email, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("SecureAuth - Email Verification Code");

        message.setText(
                "Hello,\n\n"
                + "Your SecureAuth verification code is:\n\n"
                + otp
                + "\n\n"
                + "This code will expire in 5 minutes.\n\n"
                + "If you did not request this code, "
                + "you can safely ignore this email.\n\n"
                + "Regards,\n"
                + "SecureAuth Team"
        );

        mailSender.send(message);
    }
}