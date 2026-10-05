package com.maccatoanthang.service;

import com.maccatoanthang.dto.response.DashboardResponse;
import com.maccatoanthang.dto.response.ExportResponse;

public interface DashboardService {

    DashboardResponse summary();

    ExportResponse export();
}
