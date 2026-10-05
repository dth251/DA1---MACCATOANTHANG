package com.maccatoanthang.service.impl;

import com.maccatoanthang.dto.request.ClientRequestSubmit;
import com.maccatoanthang.dto.request.RequestUpdateRequest;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.RequestResponse;
import com.maccatoanthang.dto.response.SubmissionResponse;
import com.maccatoanthang.exception.BadRequestException;
import com.maccatoanthang.exception.ConflictException;
import com.maccatoanthang.exception.ResourceNotFoundException;
import com.maccatoanthang.mapper.RequestMapper;
import com.maccatoanthang.model.Order;
import com.maccatoanthang.model.Request;
import com.maccatoanthang.model.User;
import com.maccatoanthang.model.enums.RequestStatus;
import com.maccatoanthang.model.enums.RequestType;
import com.maccatoanthang.repository.RequestRepository;
import com.maccatoanthang.service.OrderService;
import com.maccatoanthang.service.RequestService;
import com.maccatoanthang.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import com.maccatoanthang.model.ContactSnapshot;
import com.maccatoanthang.service.SubmissionGuard;

@Service
@RequiredArgsConstructor
@Transactional
public class RequestServiceImpl implements RequestService {

    private final RequestRepository requestRepository;

    private final SubmissionGuard submissionGuard;

    private final UserService userService;

    private final OrderService orderService;

    private final RequestMapper requestMapper;

    @Override
    public SubmissionResponse submit(ClientRequestSubmit request, Long userId) {
        var reservation = submissionGuard.reserve(request, userId);
        if (reservation.existing() != null) {
            return reservation.existing();
        }

        // 2. Resolve user (registered or guest)
        User user = userService.resolve(request.user(), userId);

        // 3. Process according to type
        if (request.type() == RequestType.ORDER) {
            Order order = orderService.createClient(request, user);
            order.setIdempotencyKey(reservation.key());
            var receipt = new SubmissionResponse(order.getId(), RequestType.ORDER, order.getCreatedAt());
            submissionGuard.complete(reservation.key(), receipt);
            return receipt;
        }

        String prefix = (request.type() == RequestType.CONSULT) ? "YC-TV-" : "YC-LN-";
        String id = generateRequestId(prefix);

        Request clientRequest = Request.builder()
                .id(id)
                .type(request.type())
                .topic(request.topic())
                .status(RequestStatus.NEW)
                .user(user)
                .contact(ContactSnapshot.from(request.user(), user))
                .details(request.details())
                .message(request.message())
                .idempotencyKey(reservation.key())
                .build();

        Request saved = requestRepository.saveAndFlush(clientRequest);
        var receipt = new SubmissionResponse(saved.getId(), saved.getType(), saved.getCreatedAt());
        submissionGuard.complete(reservation.key(), receipt);
        return receipt;
    }

    @Override
    @Transactional(readOnly = true)
    public PageData<RequestResponse> list(int page, int limit, Long userId) {
        if (page < 1 || limit < 1) {
            throw new BadRequestException("Số trang và số lượng mỗi trang phải lớn hơn 0");
        }
        int pageIndex = page - 1;
        int pageSize = Math.min(100, limit);
        var pageable = PageRequest.of(pageIndex, pageSize);

        Page<Request> paged = userId != null
                ? requestRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                : requestRepository.findAll(PageRequest.of(pageIndex, pageSize, Sort.by("createdAt").descending()));

        return PageData.from(paged.map(requestMapper::toResponse));
    }

    @Override
    public RequestResponse update(String id, RequestUpdateRequest request) {
        Request entity = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu: " + id));

        if (request.revision() != null && !request.revision().equals(entity.getRevision())) {
            throw new OptimisticLockingFailureException("Yêu cầu đã được cập nhật bởi phiên làm việc khác");
        }

        if (request.status() != null) {
            validateRequestStatusTransition(entity.getStatus(), request.status());
            entity.setStatus(request.status());
        }

        if (request.adminReply() != null && !request.adminReply().isBlank()) {
            entity.setAdminReply(request.adminReply());
            entity.setRepliedAt(LocalDateTime.now());
        }

        Request saved = requestRepository.saveAndFlush(entity);
        return requestMapper.toResponse(saved);
    }

    private void validateRequestStatusTransition(RequestStatus current, RequestStatus next) {
        if (current == next) {
            return;
        }
        boolean allowed = switch (current) {
            case NEW -> (next == RequestStatus.PROCESSING || next == RequestStatus.COMPLETED || next == RequestStatus.REJECTED);
            case PROCESSING -> (next == RequestStatus.COMPLETED || next == RequestStatus.REJECTED);
            case COMPLETED, REJECTED -> false;
        };

        if (!allowed) {
            throw new ConflictException("Không thể chuyển trạng thái yêu cầu từ " + current + " sang " + next);
        }
    }

    private String generateRequestId(String prefix) {
        String datePart = LocalDate.now().toString().replace("-", "").substring(2);
        return prefix + datePart + "-" + UUID.randomUUID();
    }
}
