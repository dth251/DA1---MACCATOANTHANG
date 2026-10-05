package com.maccatoanthang.controller;

import com.maccatoanthang.dto.response.ApiResponse;
import com.maccatoanthang.dto.response.DashboardResponse;
import com.maccatoanthang.dto.response.ExportResponse;
import com.maccatoanthang.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> summary() {
        return ResponseEntity.ok(ApiResponse.ok("Lấy dữ liệu dashboard thành công",
                dashboardService.summary()));
    }

    @GetMapping("/export")
    public ResponseEntity<ApiResponse<ExportResponse>> export() {
        return ResponseEntity.ok(ApiResponse.ok("Xuất dữ liệu hệ thống thành công",
                dashboardService.export()));
    }
}
