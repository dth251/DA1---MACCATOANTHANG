package com.maccatoanthang.repository;

import java.util.Map;
import com.maccatoanthang.model.Order;
import com.maccatoanthang.model.OrderItem;
import com.maccatoanthang.model.Product;
import com.maccatoanthang.model.Request;
import com.maccatoanthang.model.User;
import com.maccatoanthang.model.enums.RequestType;
import com.maccatoanthang.model.enums.UserRole;
import jakarta.persistence.EntityManager;
import jakarta.persistence.OptimisticLockException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext(classMode = org.springframework.test.annotation.DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@Transactional
class PersistenceIntegrationTest {
    @Autowired UserRepository users;
    @Autowired ProductRepository products;
    @Autowired OrderRepository orders;
    @Autowired OrderItemRepository items;
    @Autowired RequestRepository requests;
    @Autowired EntityManager entityManager;
    @Autowired JdbcTemplate jdbc;

    private User user(String phone) {
        return users.saveAndFlush(User.builder().name("Test user").phone(phone).build());
    }

    private Order order(String id, User user, String key) {
        return Order.builder().id(id).user(user).shippingFee(30000).idempotencyKey(key).build();
    }

    @Test
    void guestCanBeUpgradedWithoutLosingOrderOwnership() {
        User user = user("0912345678");
        Order order = order("test-upgrade", user, "upgrade-key");
        order.addItem(OrderItem.builder().productSnapshotId("natural").name("Original product")
                .price(185000).quantity(2).build());
        orders.saveAndFlush(order);
        user.setRole(UserRole.USER);
        user.setPassword("$2a$10$test.hash.only");
        users.flush();
        entityManager.clear();
        assertThat(users.findByPhone("0912345678").orElseThrow().getRole()).isEqualTo(UserRole.USER);
        assertThat(orders.findByIdAndUserId(order.getId(), user.getId())).isPresent();
        assertThat(orders.findByIdAndUserId(order.getId(), -1L)).isEmpty();
        assertThat(orders.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 10))
                .getTotalElements()).isEqualTo(1);
    }

    @Test
    void orderItemsKeepSnapshotsAfterProductDeletionAndCascadeOnOrderDeletion() {
        User user = user("0912345678");
        Product product = products.findById("natural").orElseThrow();
        Order order = order("test-snapshot", user, "snapshot-key");
        order.addItem(OrderItem.builder().productSnapshotId(product.getId()).name(product.getName())
                .weight(product.getWeight()).price(product.getPrice()).quantity(2).build());
        orders.saveAndFlush(order);
        products.delete(product);
        products.flush();
        entityManager.clear();
        OrderItem saved = items.findByOrderIdOrderByIdAsc(order.getId()).getFirst();
        assertThat(saved.getPrice()).isEqualTo(185000);
        assertThat(saved.getProductSnapshotId()).isEqualTo("natural");
        assertThat(saved.getOrder().getUser().getId()).isEqualTo(user.getId());
        orders.deleteById(order.getId());
        orders.flush();
        assertThat(items.findByOrderIdOrderByIdAsc(order.getId())).isEmpty();
        assertThat(users.existsById(user.getId())).isTrue();
    }

    @Test
    void duplicatePhoneIsRejectedByDatabase() {
        user("0912345678");
        assertThatThrownBy(() -> user("0912345678")).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void duplicateOrderIdempotencyKeyIsRejectedByDatabase() {
        User user = user("0912345678");
        orders.saveAndFlush(order("first", user, "same-key"));
        assertThatThrownBy(() -> orders.saveAndFlush(order("second", user, "same-key")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void duplicateRequestIdempotencyKeyIsRejectedByDatabase() {
        User user = user("0912345678");
        requests.saveAndFlush(Request.builder().id("first-request").user(user)
                .type(RequestType.CONTACT).idempotencyKey("same-request-key").build());
        assertThatThrownBy(() -> requests.saveAndFlush(Request.builder().id("second-request").user(user)
                .type(RequestType.CONTACT).idempotencyKey("same-request-key").build()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsPricesThatAreNotMultiplesOfOneThousand() {
        Product product = products.findById("natural").orElseThrow();
        product.setPrice(1001);
        assertThatThrownBy(() -> products.flush()).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsNegativeStock() {
        products.findById("natural").orElseThrow().setStock(-1);
        assertThatThrownBy(() -> products.flush()).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsQuantityAboveNinetyNine() {
        Order order = order("invalid-quantity", user("0912345678"), null);
        order.addItem(OrderItem.builder().productSnapshotId("natural").name("Snapshot")
                .price(185000).quantity(100).build());
        assertThatThrownBy(() -> orders.saveAndFlush(order)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsOrderTypeInConsultationTable() {
        Request request = Request.builder().id("wrong-type").user(user("0912345678"))
                .type(RequestType.ORDER).build();
        assertThatThrownBy(() -> requests.saveAndFlush(request)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void requestJsonDetailsRoundTripAndStaleRevisionsAreRejected() {
        Request request = requests.saveAndFlush(Request.builder().id("json-request")
                .user(user("0912345678")).type(RequestType.CONSULT)
                .details(Map.of("company", "Macca", "quantity", 50, "options", Map.of("giftWrap", true)))
                .build());
        Integer initialRevision = request.getRevision();
        entityManager.detach(request);
        Request current = requests.findById(request.getId()).orElseThrow();
        assertThat(current.getDetails()).containsEntry("quantity", 50)
                .containsEntry("options", Map.of("giftWrap", true));
        current.setAdminReply("Reply");
        requests.flush();
        assertThat(current.getRevision()).isEqualTo(initialRevision + 1);
        assertThat(current.getCreatedAt()).isNotNull();
        assertThat(current.getUpdatedAt()).isAfterOrEqualTo(current.getCreatedAt());
        entityManager.clear();
        request.setAdminReply("Stale reply");
        assertThatThrownBy(() -> entityManager.merge(request)).isInstanceOf(OptimisticLockException.class);
    }

    @Test
    void testCountActiveReservationsQuery() {
        long count = items.countActiveReservations("natural");
        assertThat(count).isEqualTo(0L);
    }

    @Test
    @EnabledIfEnvironmentVariable(named = "TEST_DB_DRIVER", matches = "org.postgresql.Driver")
    void postgresStoresDetailsAsJsonbAndCreatesIndexes() {
        assertThat(jdbc.queryForObject(
                "select data_type from information_schema.columns where table_schema = 'public' " +
                        "and table_name = 'client_request' and column_name = 'details'", String.class))
                .isEqualTo("jsonb");
        assertThat(jdbc.queryForList("select indexname from pg_indexes where schemaname = 'public'", String.class))
                .contains("idx_product_category", "idx_orders_user", "idx_order_item_order",
                        "idx_request_user", "idx_article_category_sort");
    }
}
