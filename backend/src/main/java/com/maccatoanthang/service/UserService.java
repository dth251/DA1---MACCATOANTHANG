package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.UserInput;
import com.maccatoanthang.dto.request.UserProfileUpdateRequest;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.UserResponse;
import com.maccatoanthang.model.User;

public interface UserService {

    UserResponse profile(Long id);

    UserResponse update(Long id, UserProfileUpdateRequest request);

    void changePassword(Long id, com.maccatoanthang.dto.request.ChangePasswordRequest request);

    PageData<UserResponse> list(int page, int limit);

    User resolve(UserInput input, Long userId);
}
