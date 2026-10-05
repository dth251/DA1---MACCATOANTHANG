package com.maccatoanthang.service.impl;

import com.maccatoanthang.dto.request.UserInput;
import com.maccatoanthang.dto.request.UserProfileUpdateRequest;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.UserResponse;
import com.maccatoanthang.exception.BadRequestException;
import com.maccatoanthang.exception.ResourceNotFoundException;
import com.maccatoanthang.mapper.UserMapper;
import com.maccatoanthang.model.User;
import com.maccatoanthang.model.enums.UserRole;
import com.maccatoanthang.repository.UserRepository;
import com.maccatoanthang.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    private final UserMapper userMapper;

    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserResponse profile(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin người dùng: " + id));
        return userMapper.toResponse(user);
    }

    @Override
    public UserResponse update(Long id, UserProfileUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin người dùng: " + id));
        user.setName(request.name());
        user.setEmail(request.email());
        user.setAddress(request.address());
        User saved = userRepository.save(user);
        return userMapper.toResponse(saved);
    }

    @Override
    public void changePassword(Long id, com.maccatoanthang.dto.request.ChangePasswordRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin người dùng: " + id));
        if (user.getPassword() == null || !passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác");
        }
        com.maccatoanthang.util.Passwords.validate(request.newPassword());
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public PageData<UserResponse> list(int page, int limit) {
        if (page < 1 || limit < 1) {
            throw new BadRequestException("Số trang và số lượng mỗi trang phải lớn hơn 0");
        }
        int pageIndex = page - 1;
        int pageSize = Math.min(100, limit);
        var pageable = PageRequest.of(pageIndex, pageSize, Sort.by("id").descending());
        Page<User> paged = userRepository.findAll(pageable);
        return PageData.from(paged.map(userMapper::toResponse));
    }

    @Override
    public User resolve(UserInput input, Long userId) {
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản người dùng"));
            if (user.getRole() != UserRole.USER) {
                throw new com.maccatoanthang.exception.UnauthorizedException("Tài khoản không hợp lệ");
            }
            return user;
        }
        if (input == null || input.phone() == null || input.phone().isBlank()) {
            throw new BadRequestException("Thông tin người gửi không được để trống");
        }
        // Anonymous contact details belong to this submission, never to an account found by phone.
        return null;
    }
}
