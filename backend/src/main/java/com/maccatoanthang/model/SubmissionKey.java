package com.maccatoanthang.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/** Reservation and receipt are committed atomically with the submitted order/request. */
@Entity
@Table(name = "submission_key")
public class SubmissionKey {
    @Id
    @Column(length = 64)
    private String id;
    @Column(nullable = false, length = 64)
    private String fingerprint;
    @Column(length = 80)
    private String receiptId;
    @Column(length = 20)
    private String receiptType;
    private LocalDateTime createdAt;
}
