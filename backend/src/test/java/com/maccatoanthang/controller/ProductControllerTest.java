package com.maccatoanthang.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.dto.request.ProductRequest;
import com.maccatoanthang.model.enums.ProductCategory;
import com.maccatoanthang.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        adminToken = jwtUtil.generateAdminToken("admin");
        userToken = jwtUtil.generateUserToken("0988776655", 999L);
    }

    // 1. GET /api/products - Happy Path
    @Test
    void testGetProductsPublic_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/products")
                        .param("page", "1")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.pagination.currentPage").value(1));
    }

    // 2. GET /api/products - Filter Category
    @Test
    void testGetProducts_filterCategory_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/products")
                        .param("category", "SHELL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray());
    }

    // 3. GET /api/products - Invalid Pagination (page = 0)
    @Test
    void testGetProducts_invalidPagination_Returns400() throws Exception {
        mockMvc.perform(get("/api/products")
                        .param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 4. GET /api/products/{id} - Happy Path
    @Test
    void testGetProductById_Returns200() throws Exception {
        mockMvc.perform(get("/api/products/natural"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("natural"));
    }

    // 5. GET /api/products/{id} - Not Found
    @Test
    void testGetProductNotFound_Returns404() throws Exception {
        mockMvc.perform(get("/api/products/non-existent-product-id-999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 6. POST /api/admin/products - Unauthorized (No Token)
    @Test
    void testAdminCreateProductWithoutAuth_Returns401() throws Exception {
        ProductRequest req = new ProductRequest("test-product", "Test Product",
                ProductCategory.SHELL, "Nguyên vỏ", "assets/img.png", "500g",
                100000, "Mới", "Mô tả", "Thành phần", 10, true);

        mockMvc.perform(post("/api/admin/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // 7. POST /api/admin/products - Forbidden (User Token)
    @Test
    void testAdminCreateProductWithUserRole_Returns403() throws Exception {
        ProductRequest req = new ProductRequest("test-cust-prod", "Test Prod",
                ProductCategory.SHELL, "Loại", "assets/img.png", "500g",
                100000, "Tag", "Desc", "Ing", 10, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 8. POST /api/admin/products - Happy Path (Admin Token)
    @Test
    void testAdminCreateProductWithAdminToken_Returns201() throws Exception {
        ProductRequest req = new ProductRequest("macca-vip-box-test", "Macca Hộp VIP Test",
                ProductCategory.GIFT, "HỘP QUÀ", "assets/gift.png", "1kg",
                500000, "VIP", "Quà tặng cao cấp", "Macca", 50, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("macca-vip-box-test"));
    }

    // 9. POST /api/admin/products - Conflict (Duplicate ID)
    @Test
    void testAdminCreateProduct_duplicateId_Returns409() throws Exception {
        // "natural" is already seeded in DataInitializer
        ProductRequest req = new ProductRequest("natural", "Macca Trùng ID",
                ProductCategory.SHELL, "Loại", "assets/img.png", "500g",
                120000, "Tag", "Desc", "Ing", 10, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 10. POST /api/admin/products - Invalid Input (Price negative or invalid)
    @Test
    void testAdminCreateProduct_invalidInput_Returns400() throws Exception {
        ProductRequest req = new ProductRequest("", "",
                null, null, null, null,
                -1000, null, null, null, -5, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 11. PUT /api/admin/products/{id} - Happy Path
    @Test
    void testAdminUpdateProduct_Returns200() throws Exception {
        ProductRequest req = new ProductRequest("natural", "Macca Nguyên Vỏ Cập Nhật",
                ProductCategory.SHELL, "Nguyên vỏ", "assets/natural.png", "500g",
                150000, "Best seller", "Mô tả", "Macca", 50, true);

        mockMvc.perform(put("/api/admin/products/natural")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Macca Nguyên Vỏ Cập Nhật"));
    }

    // 12. PUT /api/admin/products/{id} - Not Found
    @Test
    void testAdminUpdateProduct_notFound_Returns404() throws Exception {
        ProductRequest req = new ProductRequest("non-existent-999", "Không tồn tại",
                ProductCategory.SHELL, "Loại", "assets/img.png", "500g",
                100000, "Tag", "Desc", "Ing", 10, true);

        mockMvc.perform(put("/api/admin/products/non-existent-999")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 13. DELETE /api/admin/products/{id} - Happy Path
    @Test
    void testAdminDeleteProduct_Returns200() throws Exception {
        // Create a temporary product to delete
        ProductRequest req = new ProductRequest("to-delete-prod", "Xóa sản phẩm này",
                ProductCategory.SHELL, "Loại", "assets/img.png", "500g",
                100000, "Tag", "Desc", "Ing", 10, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/admin/products/to-delete-prod")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // 14. DELETE /api/admin/products/{id} - Not Found
    @Test
    void testAdminDeleteProduct_notFound_Returns404() throws Exception {
        mockMvc.perform(delete("/api/admin/products/non-existent-id-888")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 15. GET /api/admin/products/{id} - Admin can view active and inactive products
    @Test
    void testAdminGetProductById_canViewInactiveProduct() throws Exception {
        ProductRequest req = new ProductRequest("inactive-prod-for-test", "Sản phẩm ẩn",
                ProductCategory.SHELL, "Loại", "assets/img.png", "500g",
                100000, "Tag", "Desc", "Ing", 10, false);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Public GET should return 404
        mockMvc.perform(get("/api/products/inactive-prod-for-test"))
                .andExpect(status().isNotFound());

        // Admin GET should return 200
        mockMvc.perform(get("/api/admin/products/inactive-prod-for-test")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("inactive-prod-for-test"))
                .andExpect(jsonPath("$.data.active").value(false));
    }

    // 16. GET /api/admin/products/{id} - Unauthorized
    @Test
    void testAdminGetProductWithoutAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/admin/products/natural"))
                .andExpect(status().isUnauthorized());
    }

    // 17. Tracing X-Request-Id header is returned
    @Test
    void testResponseContainsRequestIdHeader() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Request-Id"));
    }
}
