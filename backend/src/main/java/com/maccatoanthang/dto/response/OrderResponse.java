package com.maccatoanthang.dto.response;

import com.maccatoanthang.model.enums.OrderSource;
import com.maccatoanthang.model.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {

    private String id;

    private OrderStatus status;

    private String statusLabel;

    private UserResponse user;

    private List<Item> items;

    private int shippingFee;

    private long total;

    private String note;

    private OrderSource source;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {

        private String id;

        private String name;

        private String weight;

        private int price;

        private int quantity;

        public String id() {
            return this.id;
        }

        public String name() {
            return this.name;
        }

        public String weight() {
            return this.weight;
        }

        public int price() {
            return this.price;
        }

        public int quantity() {
            return this.quantity;
        }
    }

    public String id() {
        return this.id;
    }

    public OrderStatus status() {
        return this.status;
    }

    public String statusLabel() {
        return this.statusLabel;
    }

    public UserResponse customer() {
        return this.user;
    }

    public UserResponse user() {
        return this.user;
    }

    public List<Item> items() {
        return this.items;
    }

    public int shippingFee() {
        return this.shippingFee;
    }

    public long total() {
        return this.total;
    }

    public String note() {
        return this.note;
    }

    public OrderSource source() {
        return this.source;
    }

    public LocalDateTime createdAt() {
        return this.createdAt;
    }

    public LocalDateTime updatedAt() {
        return this.updatedAt;
    }
}
