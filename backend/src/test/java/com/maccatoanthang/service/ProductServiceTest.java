package com.maccatoanthang.service;

import com.maccatoanthang.dto.request.ProductRequest;
import com.maccatoanthang.dto.response.PageData;
import com.maccatoanthang.dto.response.ProductResponse;
import com.maccatoanthang.exception.ConflictException;
import com.maccatoanthang.exception.ResourceNotFoundException;
import com.maccatoanthang.model.enums.ProductCategory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ProductServiceTest {

    @Autowired
    private ProductService productService;

    @Test
    void testListAndGetProduct() {
        PageData<ProductResponse> paged = productService.list(1, 10, null, false);
        assertNotNull(paged);
        assertFalse(paged.getItems().isEmpty());

        String firstId = paged.getItems().get(0).id();
        ProductResponse single = productService.get(firstId);
        assertNotNull(single);
        assertEquals(firstId, single.id());
    }

    @Test
    void testCreateProduct_SuccessAndDuplicateConflict() {
        ProductRequest req = new ProductRequest(
                "macca-roasted-1kg", "Macca Nướng 1kg", ProductCategory.SHELL,
                "MACCA NGUYÊN VỎ", "assets/roasted.png", "1kg", 350000,
                "HOT", "Thơm ngon", "Macca", 100, true
        );
        ProductResponse res = productService.create(req);
        assertEquals("macca-roasted-1kg", res.id());

        // Creating with same ID throws ConflictException
        assertThrows(ConflictException.class, () -> productService.create(req));
    }

    @Test
    void testGetNonExistentProduct_ThrowsResourceNotFoundException() {
        assertThrows(ResourceNotFoundException.class, () -> productService.get("unknown-id-xyz"));
    }
}
