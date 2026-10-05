package com.maccatoanthang;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.dto.request.*;
import com.maccatoanthang.model.*;
import com.maccatoanthang.model.enums.*;
import com.maccatoanthang.repository.*;
import com.maccatoanthang.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Regression coverage for the vulnerabilities documented in BACKEND_REVIEW.md.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityRegressionTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AuthService auth;
    @Autowired UserService users;
    @Autowired OrderService orders;
    @Autowired RequestService requests;
    @Autowired UserRepository userRepo;
    @Autowired ProductRepository productRepo;
    @Autowired RequestRepository requestRepo;
    @Autowired OrderRepository orderRepo;
    @Autowired com.maccatoanthang.security.JwtUtil jwt;
    @Autowired AuthSessionRepository sessions;

    ClientRequestSubmit submission(String phone, RequestType type) {
        return new ClientRequestSubmit(type, UUID.randomUUID().toString(),
                new UserInput("Review Guest", phone, null, "Original address", null, null),
                type == RequestType.ORDER ? List.of(new ItemInput("natural", 1)) : null,
                ShippingMethod.STANDARD, "cod", null, "Review message", null, null);
    }

    @Test void anonymousSubmissionCannotOverwriteRegisteredProfile() throws Exception {
        var registered = auth.register(new RegisterRequest("Owner", "0900000101", null, "Password123"));
        var payload = submission("0900000101", RequestType.CONTACT);
        payload.getUser().setName("Replaced by anonymous visitor");
        payload.getUser().setAddress("Attacker address");
        mvc.perform(post("/api/requests").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload))).andExpect(status().isCreated());
        var profile = users.profile(registered.user().getId());
        assertEquals("Owner", profile.getName());
        assertNull(profile.getAddress());
    }

    @Test void registrationCannotClaimAnonymousHistory() throws Exception {
        var receipt = requests.submit(submission("0900000102", RequestType.ORDER), null);
        var result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new RegisterRequest("New claimant", "0900000102", null, "Password123"))))
                .andExpect(status().isCreated()).andReturn();
        String token = json.readTree(result.getResponse().getContentAsString()).path("data").path("accessToken").asText();
        mvc.perform(get("/api/user/orders/" + receipt.id()).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test void refreshTokenIsRejectedAfterLogout() throws Exception {
        var login = auth.register(new RegisterRequest("Logout Review", "0900000103", null, "Password123"));
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + login.accessToken()))
                .andExpect(status().isOk());
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("refreshToken", login.refreshToken()))))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test void inactiveOutOfStockProductCannotBeViewedOrOrdered() throws Exception {
        Product p = productRepo.saveAndFlush(Product.builder().id("review-inactive").name("Hidden product")
                .category(ProductCategory.SHELL).price(10000).stock(0).active(false).build());
        mvc.perform(get("/api/products/" + p.getId())).andExpect(status().isNotFound());
        var payload = submission("0900000104", RequestType.ORDER);
        payload.setItems(List.of(new ItemInput(p.getId(), 2)));
        mvc.perform(post("/api/requests").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload))).andExpect(status().isConflict());
        assertEquals(0, productRepo.findById(p.getId()).orElseThrow().getStock());
    }

    @Test void profileUpdatePreservesExistingOrderAddress() {
        var registered = auth.register(new RegisterRequest("Owner", "0900000105", null, "Password123"));
        var receipt = requests.submit(submission("0900000105", RequestType.ORDER), registered.user().id());
        var user = userRepo.findByPhone("0900000105").orElseThrow();
        assertEquals("Original address", orders.get(receipt.id(), null).user().getAddress());
        users.update(user.getId(), new UserProfileUpdateRequest("Review Guest", null, "New address"));
        assertEquals("Original address", orders.get(receipt.id(), null).user().getAddress());
    }

    @Test void updateReturnsCommittedRevision() {
        var receipt = requests.submit(submission("0900000106", RequestType.CONTACT), null);
        var response = requests.update(receipt.id(), new RequestUpdateRequest(RequestStatus.PROCESSING, "Reply", 0));
        assertEquals(1, response.getRevision());
        assertEquals(1, requestRepo.findById(receipt.id()).orElseThrow().getRevision());
        assertEquals(2, requests.update(receipt.id(), new RequestUpdateRequest(RequestStatus.COMPLETED, null, response.getRevision())).getRevision());
    }

    @Test void duplicateOrderIdCannotOverwriteExistingOrder() {
        var firstUser = userRepo.saveAndFlush(User.builder().name("First").phone("0900000107").build());
        var secondUser = userRepo.saveAndFlush(User.builder().name("Second").phone("0900000108").build());
        String id = "DH-review-collision";
        Order first = Order.builder().id(id).user(firstUser).shippingFee(30000).note("Original").build();
        first.addItem(OrderItem.builder().productSnapshotId("natural").name("Original item").price(10000).quantity(1).build());
        orderRepo.saveAndFlush(first);
        Order second = Order.builder().id(id).user(secondUser).shippingFee(45000).note("Replacement").build();
        second.addItem(OrderItem.builder().productSnapshotId("other").name("Replacement item").price(20000).quantity(2).build());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> orderRepo.saveAndFlush(second));
        var result = orders.get(id, null);
        assertEquals(firstUser.getId(), result.user().getId());
        assertEquals("Original", result.note());
        assertEquals(1, result.items().size());
        assertEquals("natural", result.items().getFirst().id());
    }

    @Test void mismatchedExpectedTotalIsRejected() throws Exception {
        var payload = submission("0900000109", RequestType.ORDER);
        payload.setExpectedTotal(0L);
        mvc.perform(post("/api/requests").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload))).andExpect(status().isConflict());
    }

    @Test void passwordOver72BytesIsRejected() throws Exception {
        var payload = new RegisterRequest("Password Review", "0900000110", null, "\u1eaf".repeat(30));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload))).andExpect(status().isBadRequest());
        var differentPassword = new LoginRequest("0900000110", "\u1eaf".repeat(24) + "DIFFERENT_SUFFIX");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(differentPassword))).andExpect(status().isBadRequest());
    }

    @Test void rotatedRefreshCannotBeReusedAndRevokesItsSessionFamily() {
        var login = auth.register(new RegisterRequest("Rotation", "0900000111", null, "Password123"));
        var rotated = auth.refreshToken(new RefreshTokenRequest(login.refreshToken()));
        assertTrue(jwt.isTokenValid(rotated.accessToken()));
        assertThrows(com.maccatoanthang.exception.UnauthorizedException.class,
                () -> auth.refreshToken(new RefreshTokenRequest(login.refreshToken())));
        assertFalse(jwt.isTokenValid(rotated.accessToken()));
        assertThrows(com.maccatoanthang.exception.UnauthorizedException.class,
                () -> auth.refreshToken(new RefreshTokenRequest(rotated.refreshToken())));
    }

    @Test void revocationSurvivesNewJwtServiceInstance() {
        var pair = jwt.issue("admin", "ADMIN", null);
        jwt.revoke(pair.accessToken());
        var freshInstance = new com.maccatoanthang.security.JwtUtil(
                "test-only-secret-key-at-least-32-bytes-long", 60, 7, sessions);
        assertFalse(freshInstance.isTokenValid(pair.accessToken()));
        assertFalse(freshInstance.isTokenValid(pair.refreshToken()));
    }

    @Test void concurrentRefreshHasExactlyOneWinnerAndReplayRevokesFamily() throws Exception {
        var pair = jwt.issue("admin", "ADMIN", null);
        var outcomes = concurrently(() -> {
            try { jwt.rotate(pair.refreshToken()); return "rotated"; }
            catch (com.maccatoanthang.exception.UnauthorizedException ex) { return "rejected"; }
        });
        assertEquals(1, outcomes.stream().filter("rotated"::equals).count());
        assertEquals(1, outcomes.stream().filter("rejected"::equals).count());
        assertFalse(jwt.isTokenValid(pair.accessToken()));
    }

    @Test void stockReservedOnceAndRestoredOnceOnCancellation() {
        Product p = trackedProduct("stock-restore", 3);
        var payload = submission("0900000112", RequestType.ORDER);
        payload.setItems(List.of(new ItemInput(p.getId(), 2)));
        var receipt = requests.submit(payload, null);
        assertEquals(receipt.id(), requests.submit(payload, null).id());
        assertEquals(1, productRepo.findById(p.getId()).orElseThrow().getStock());
        orders.updateStatus(receipt.id(), new StatusUpdateRequest(OrderStatus.CANCELLED));
        orders.updateStatus(receipt.id(), new StatusUpdateRequest(OrderStatus.CANCELLED));
        assertEquals(3, productRepo.findById(p.getId()).orElseThrow().getStock());
    }

    @Test void concurrentOrdersCannotOversell() throws Exception {
        Product p = trackedProduct("stock-race", 1);
        var outcomes = concurrently(() -> {
            var payload = submission("0900000113", RequestType.ORDER);
            payload.setItems(List.of(new ItemInput(p.getId(), 1)));
            try { requests.submit(payload, null); return "created"; }
            catch (com.maccatoanthang.exception.ConflictException ex) { return "rejected"; }
        });
        assertEquals(1, outcomes.stream().filter("created"::equals).count());
        assertEquals(1, outcomes.stream().filter("rejected"::equals).count());
        assertEquals(0, productRepo.findById(p.getId()).orElseThrow().getStock());
    }

    @Test void concurrentDuplicateSubmissionsReturnSameReceipt() throws Exception {
        Product p = trackedProduct("idempotency-race", 3);
        var payload = submission("0900000114", RequestType.ORDER);
        payload.setItems(List.of(new ItemInput(p.getId(), 1)));
        var outcomes = concurrently(() -> requests.submit(payload, null).id());
        assertEquals(outcomes.get(0), outcomes.get(1));
        assertEquals(2, productRepo.findById(p.getId()).orElseThrow().getStock());
    }

    @Test void idempotencyKeysAreScopedToAuthenticatedOwner() {
        var first = auth.register(new RegisterRequest("First owner", "0900000118", null, "Password123"));
        var second = auth.register(new RegisterRequest("Second owner", "0900000119", null, "Password123"));
        var payload = submission("0900000118", RequestType.ORDER);
        var firstReceipt = requests.submit(payload, first.user().id());
        var secondReceipt = requests.submit(payload, second.user().id());
        assertNotEquals(firstReceipt.id(), secondReceipt.id());
        assertEquals(second.user().id(), orders.get(secondReceipt.id(), second.user().id()).user().id());
        assertThrows(com.maccatoanthang.exception.ForbiddenException.class,
                () -> orders.get(firstReceipt.id(), second.user().id()));
    }

    @Test void changedPayloadCannotReuseKeyAndMissingKeyIsRejected() throws Exception {
        var payload = submission("0900000115", RequestType.CONTACT);
        requests.submit(payload, null);
        payload.setMessage("Changed message");
        assertThrows(com.maccatoanthang.exception.ConflictException.class, () -> requests.submit(payload, null));
        payload.setIdempotencyKey(null);
        mvc.perform(post("/api/requests").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload))).andExpect(status().isBadRequest());
    }

    @Test void priceConflictRollsBackStockAndAllowsRetry() throws Exception {
        Product p = trackedProduct("price-rollback", 2);
        var payload = submission("0900000116", RequestType.ORDER);
        payload.setItems(List.of(new ItemInput(p.getId(), 1)));
        payload.setExpectedTotal(0L);
        mvc.perform(post("/api/requests").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors.code").value("PRICE_CHANGED"))
                .andExpect(jsonPath("$.errors.actualTotal").value(40000));
        assertEquals(2, productRepo.findById(p.getId()).orElseThrow().getStock());
        payload.setExpectedTotal(40000L);
        requests.submit(payload, null);
        assertEquals(1, productRepo.findById(p.getId()).orElseThrow().getStock());
    }

    @Test void concurrentCancellationRestoresInventoryOnlyOnce() throws Exception {
        Product p = trackedProduct("cancel-race", 2);
        var payload = submission("0900000117", RequestType.ORDER);
        payload.setItems(List.of(new ItemInput(p.getId(), 1)));
        var receipt = requests.submit(payload, null);
        concurrently(() -> orders.updateStatus(receipt.id(), new StatusUpdateRequest(OrderStatus.CANCELLED)).id());
        assertEquals(2, productRepo.findById(p.getId()).orElseThrow().getStock());
    }

    private Product trackedProduct(String id, int stock) {
        return productRepo.saveAndFlush(Product.builder().id(id).name(id).category(ProductCategory.SHELL)
                .price(10000).active(true).stock(stock).build());
    }

    private List<String> concurrently(java.util.concurrent.Callable<String> action) throws Exception {
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> { start.await(); return action.call(); });
            var second = executor.submit(() -> { start.await(); return action.call(); });
            start.countDown();
            return List.of(first.get(30, java.util.concurrent.TimeUnit.SECONDS),
                    second.get(30, java.util.concurrent.TimeUnit.SECONDS));
        }
    }
}
