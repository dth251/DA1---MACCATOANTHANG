package com.maccatoanthang.model;

import com.maccatoanthang.model.enums.OrderSource;
import com.maccatoanthang.model.enums.OrderStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(
        name = "orders",
        indexes = {
                @Index(name = "idx_orders_user", columnList = "user_id"),
                @Index(name = "idx_orders_status_created", columnList = "status,created_at")
        }
)
@Check(constraints = "shipping_fee >= 0")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order extends AuditedEntity {

    @Id
    @Column(length = 80)
    private String id;

    @jakarta.persistence.Version
    @Column(nullable = false)
    private Long version;

    @jakarta.persistence.Embedded
    private ContactSnapshot contact;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private com.maccatoanthang.model.enums.ShippingMethod shippingMethod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public User getCustomer() {
        return this.user;
    }

    public void setCustomer(User user) {
        this.user = user;
    }

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(nullable = false)
    private Integer shippingFee;

    @Column(columnDefinition = "text")
    private String note;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderSource source = OrderSource.CLIENT;

    @Column(unique = true, length = 128)
    private String idempotencyKey;

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @Setter(AccessLevel.NONE)
    private List<OrderItem> items = new ArrayList<>();

    public void addItem(OrderItem item) {
        Objects.requireNonNull(item, "item");
        if (item.getOrder() != null && item.getOrder() != this) {
            throw new IllegalArgumentException("Item already belongs to another order");
        }
        items.add(item);
        item.setOrder(this);
    }

    public void removeItem(OrderItem item) {
        if (items.remove(item)) {
            item.setOrder(null);
        }
    }
}
