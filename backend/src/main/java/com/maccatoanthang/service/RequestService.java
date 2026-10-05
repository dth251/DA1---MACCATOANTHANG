package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.ClientRequestSubmit;
import com.maccatoanthang.dto.request.RequestUpdateRequest;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.RequestResponse;
import com.maccatoanthang.dto.response.SubmissionResponse;

public interface RequestService {

    SubmissionResponse submit(ClientRequestSubmit request, Long customerId);

    PageData<RequestResponse> list(int page, int limit, Long customerId);

    RequestResponse update(String id, RequestUpdateRequest request);
}
