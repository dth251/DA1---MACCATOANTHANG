package com.maccatoanthang.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private long totalProducts;

    private long totalOrders;

    private long totalUsers;

    private long totalCustomers;

    private long completedOrderValue;

    public DashboardResponse(long totalProducts, long totalOrders, long totalUsers, long completedOrderValue) {
        this.totalProducts = totalProducts;
        this.totalOrders = totalOrders;
        this.totalUsers = totalUsers;
        this.totalCustomers = totalUsers;
        this.completedOrderValue = completedOrderValue;
    }

    public long totalProducts() {
        return this.totalProducts;
    }

    public long totalOrders() {
        return this.totalOrders;
    }

    public long totalUsers() {
        return this.totalUsers;
    }

    public long totalCustomers() {
        return this.totalUsers;
    }

    public long completedOrderValue() {
        return this.completedOrderValue;
    }
}
