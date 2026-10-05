package com.maccatoanthang.init;

import com.maccatoanthang.model.enums.ArticleCategory;
import com.maccatoanthang.repository.ArticleRepository;
import com.maccatoanthang.repository.UserRepository;
import com.maccatoanthang.repository.OrderRepository;
import com.maccatoanthang.repository.ProductRepository;
import com.maccatoanthang.repository.RequestRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.test.annotation.DirtiesContext(classMode = org.springframework.test.annotation.DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@Transactional
class DataInitializerTest {
    @Autowired DataInitializer initializer;
    @Autowired ProductRepository products;
    @Autowired ArticleRepository articles;
    @Autowired UserRepository users;
    @Autowired OrderRepository orders;
    @Autowired RequestRepository requests;

    @Test
    void seedsFrontendCatalogAndNoFakeCommerceData() {
        assertThat(products.findAll()).extracting("id")
                .containsExactlyInAnyOrder("natural", "kernel", "roasted", "gift");
        assertThat(products.findById("gift").orElseThrow().getPrice()).isEqualTo(485000);
        assertThat(products.findByActiveTrue(PageRequest.of(0, 10)).getTotalElements()).isEqualTo(4);
        assertThat(articles.findByPublishedTrueOrderBySortOrderAscSlugAsc(PageRequest.of(0, 10)).getContent())
                .extracting("slug").containsExactly("thuong-thuc-macca", "sua-chua-macca", "chon-qua-macca");
        assertThat(articles.findByCategoryAndPublishedTrueOrderBySortOrderAscSlugAsc(
                ArticleCategory.KITCHEN, PageRequest.of(0, 10)).getTotalElements()).isEqualTo(1);
        assertThat(articles.findBySlugAndPublishedTrue("thuong-thuc-macca").orElseThrow().getBody())
                .contains("<p>");
        assertThat(users.count()).isZero();
        assertThat(orders.count()).isZero();
        assertThat(requests.count()).isZero();
    }

    @Test
    void repeatedSeedingPreservesExistingEditsAndDoesNotRestoreDeletedProducts() throws Exception {
        products.findById("natural").orElseThrow().setPrice(200000);
        products.deleteById("gift");
        products.flush();
        initializer.run();
        products.flush();
        assertThat(products.count()).isEqualTo(3);
        assertThat(products.findById("natural").orElseThrow().getPrice()).isEqualTo(200000);
        assertThat(articles.count()).isEqualTo(3);
    }

    @Test
    void emptyArticlesAreSeededIndependentlyOfProducts() throws Exception {
        products.findById("natural").orElseThrow().setPrice(200000);
        articles.deleteAllInBatch();
        initializer.run();
        assertThat(articles.count()).isEqualTo(3);
        assertThat(products.findById("natural").orElseThrow().getPrice()).isEqualTo(200000);
    }

    @Test
    void emptyProductsAreSeededIndependentlyOfArticles() throws Exception {
        articles.findById("thuong-thuc-macca").orElseThrow().setTitle("Custom article");
        products.deleteAllInBatch();
        initializer.run();
        assertThat(products.count()).isEqualTo(4);
        assertThat(articles.findById("thuong-thuc-macca").orElseThrow().getTitle()).isEqualTo("Custom article");
    }
}
