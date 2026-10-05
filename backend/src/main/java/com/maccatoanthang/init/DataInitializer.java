package com.maccatoanthang.init;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.maccatoanthang.model.Article;
import com.maccatoanthang.model.Product;
import com.maccatoanthang.repository.ArticleRepository;
import com.maccatoanthang.repository.ProductRepository;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataInitializer implements CommandLineRunner {

    private final ProductRepository productRepository;

    private final ArticleRepository articleRepository;

    private final ObjectMapper objectMapper;

    public DataInitializer(ProductRepository productRepository,
                           ArticleRepository articleRepository,
                           ObjectMapper objectMapper) {
        this.productRepository = productRepository;
        this.articleRepository = articleRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) throws IOException {
        if (productRepository.count() == 0) {
            try (InputStream stream = new ClassPathResource("seed/products.json").getInputStream()) {
                Product[] products = objectMapper.readValue(stream, Product[].class);
                if (products != null && products.length > 0) {
                    productRepository.saveAll(List.of(products));
                }
            }
        }
        if (articleRepository.count() == 0) {
            try (InputStream stream = new ClassPathResource("seed/articles.json").getInputStream()) {
                Article[] articles = objectMapper.readValue(stream, Article[].class);
                if (articles != null && articles.length > 0) {
                    articleRepository.saveAll(List.of(articles));
                }
            }
        }
    }
}
