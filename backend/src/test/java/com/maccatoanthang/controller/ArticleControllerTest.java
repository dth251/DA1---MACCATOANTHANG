package com.maccatoanthang.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.dto.request.ArticleRequest;
import com.maccatoanthang.model.enums.ArticleCategory;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext
class ArticleControllerTest {

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

    // 1. GET /api/articles - Happy Path
    @Test
    void listArticles_happyPath_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/articles")
                        .param("page", "1")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.pagination.currentPage").value(1));
    }

    // 2. GET /api/articles - Invalid Pagination (page = 0)
    @Test
    void listArticles_invalidPagination_shouldReturn400() throws Exception {
        mockMvc.perform(get("/api/articles")
                        .param("page", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 3. GET /api/articles/{slug} - Happy Path
    @Test
    void getArticleBySlug_happyPath_shouldReturn200() throws Exception {
        mockMvc.perform(get("/api/articles/thuong-thuc-macca"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slug").value("thuong-thuc-macca"))
                .andExpect(jsonPath("$.data.title").isNotEmpty());
    }

    // 4. GET /api/articles/{slug} - Not Found
    @Test
    void getArticleBySlug_notFound_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/articles/bai-viet-khong-ton-tai-999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // 5. POST /api/admin/articles - Happy Path (Admin)
    @Test
    void createArticle_admin_shouldReturn201() throws Exception {
        ArticleRequest request = ArticleRequest.builder()
                .slug("bai-viet-moi-test")
                .title("Bài viết mới kiểm thử")
                .body("<p>Nội dung chi tiết bài viết mới kiểm thử.</p>")
                .category(ArticleCategory.ENJOY)
                .label("THƯỞNG THỨC")
                .image("assets/macca-natural.png")
                .description("Mô tả bài viết kiểm thử")
                .sortOrder(10)
                .published(true)
                .build();

        mockMvc.perform(post("/api/admin/articles")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.slug").value("bai-viet-moi-test"))
                .andExpect(jsonPath("$.data.title").value("Bài viết mới kiểm thử"));
    }

    // 6. POST /api/admin/articles - Forbidden (User/Customer)
    @Test
    void createArticle_user_shouldReturn403() throws Exception {
        ArticleRequest request = ArticleRequest.builder()
                .title("Bài viết trái phép")
                .body("Nội dung")
                .category(ArticleCategory.KITCHEN)
                .build();

        mockMvc.perform(post("/api/admin/articles")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // 7. PUT /api/admin/articles/{slug} - Happy Path (Admin)
    @Test
    void updateArticle_admin_shouldReturn200() throws Exception {
        ArticleRequest updateReq = ArticleRequest.builder()
                .title("Ba cách thưởng thức macca - Đã cập nhật")
                .body("<p>Nội dung đã được biên tập lại.</p>")
                .category(ArticleCategory.ENJOY)
                .build();

        mockMvc.perform(put("/api/admin/articles/thuong-thuc-macca")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Ba cách thưởng thức macca - Đã cập nhật"));
    }

    // 8. DELETE /api/admin/articles/{slug} - Happy Path (Admin)
    @Test
    void deleteArticle_admin_shouldReturn200() throws Exception {
        // Create an article first to delete
        ArticleRequest request = ArticleRequest.builder()
                .slug("bai-viet-can-xoa")
                .title("Bài viết cần xóa")
                .body("<p>Sẽ bị xóa.</p>")
                .category(ArticleCategory.GIFT)
                .build();

        mockMvc.perform(post("/api/admin/articles")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/admin/articles/bai-viet-can-xoa")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/articles/bai-viet-can-xoa"))
                .andExpect(status().isNotFound());
    }
}
