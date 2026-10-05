package com.maccatoanthang.model;

import com.maccatoanthang.model.enums.RequestStatus;
import com.maccatoanthang.model.enums.RequestType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(
        name = "client_request",
        indexes = {
                @Index(name = "idx_request_user", columnList = "user_id"),
                @Index(name = "idx_request_status_created", columnList = "status,created_at")
        }
)
@Check(constraints = "type in ('CONSULT', 'CONTACT')")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Request extends AuditedEntity {

    @Id
    @Column(length = 80)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RequestType type;

    @Column(length = 80)
    private String topic;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RequestStatus status = RequestStatus.NEW;

    @Version
    @Column(nullable = false)
    private Integer revision;

    @jakarta.persistence.Embedded
    private ContactSnapshot contact;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public User getCustomer() {
        return this.user;
    }

    public void setCustomer(User user) {
        this.user = user;
    }

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> details;

    @Column(columnDefinition = "text")
    private String message;

    @Column(unique = true, length = 128)
    private String idempotencyKey;

    @Column(columnDefinition = "text")
    private String adminReply;

    private LocalDateTime repliedAt;
}
