package com.maccatoanthang.repository;

import com.maccatoanthang.model.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, String> {
    @Query(value = "select count(distinct coalesce(o.contact_phone, u.phone)) from orders o left join users u on u.id = o.user_id", nativeQuery = true)
    long countBuyers();

    @Query(value = "select coalesce(sum(shipping_fee), 0) from orders where status = 'COMPLETED'", nativeQuery = true)
    long completedShippingValue();

    @Query(value = "select coalesce(sum(cast(i.price as bigint) * i.quantity), 0) from order_item i join orders o on o.id = i.order_id where o.status = 'COMPLETED'", nativeQuery = true)
    long completedItemsValue();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findLocked(@Param("id") String id);
    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    @Query("SELECT o FROM Order o WHERE o.id = :id AND (:userId IS NULL OR o.user.id = :userId)")
    Optional<Order> findByIdAndUserId(@Param("id") String id, @Param("userId") Long userId);

    @Query("SELECT o FROM Order o WHERE o.id = :id AND (:customerId IS NULL OR o.user.id = :customerId)")
    Optional<Order> findByIdAndCustomerId(@Param("id") String id, @Param("customerId") Long customerId);

    @Query("SELECT o FROM Order o WHERE o.user.id = :userId ORDER BY o.createdAt DESC")
    Page<Order> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.user.id = :customerId ORDER BY o.createdAt DESC")
    Page<Order> findByCustomerIdOrderByCreatedAtDesc(@Param("customerId") Long customerId, Pageable pageable);
}
