package com.maccatoanthang.repository;

import com.maccatoanthang.model.Product;
import com.maccatoanthang.model.enums.ProductCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Product p where p.id = :id")
    java.util.Optional<Product> findLocked(@org.springframework.data.repository.query.Param("id") String id);

    Page<Product> findByActiveTrue(Pageable pageable);

    Page<Product> findByCategoryAndActiveTrue(ProductCategory category, Pageable pageable);

    Page<Product> findByCategory(ProductCategory category, Pageable pageable);
}
