package com.dhruv.auth.service;

import com.dhruv.auth.entity.User;
import com.dhruv.auth.user_repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ==========================================
    // REGISTER USER
    // ==========================================

    public User registerUser(User user) {

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException(
                    "Email already registered"
            );
        }

        user.setPassword(
                passwordEncoder.encode(
                        user.getPassword()
                )
        );

        return userRepository.save(user);
    }

    // ==========================================
    // FIND USER BY EMAIL
    // ==========================================

    public User findByEmail(String email) {

        return userRepository
                .findByEmail(email)
                .orElse(null);
    }

    // ==========================================
    // SAVE USER
    // ==========================================

    public User saveUser(User user) {

        return userRepository.save(user);
    }

    // ==========================================
    // UPDATE PASSWORD
    // ==========================================

    public void updatePassword(
            String email,
            String newPassword
    ) {

        User user = findByEmail(email);

        if (user == null) {
            throw new RuntimeException(
                    "User not found"
            );
        }

        // Always encrypt the new password
        // before saving it to the database.
        user.setPassword(
                passwordEncoder.encode(
                        newPassword
                )
        );

        userRepository.save(user);
    }
}