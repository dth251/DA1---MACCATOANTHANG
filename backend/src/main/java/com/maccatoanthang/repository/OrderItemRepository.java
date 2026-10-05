package com.maccatoanthang.repository;

import com.maccatoanthang.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Query("select count(i) from OrderItem i where i.productSnapshotId = :id "
            + "and i.stockReserved = true and i.order.status not in "
            + "(OrderStatus.COMPLETED, OrderStatus.CANCELLED)")
    long countActiveReservations(@Param("id") String id);

    List<OrderItem> findByOrderIdOrderByIdAsc(String orderId);
}
