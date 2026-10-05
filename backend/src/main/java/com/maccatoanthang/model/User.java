package com.maccatoanthang.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.maccatoanthang.model.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;

@Entity
@Table(name = "users")
@Check(constraints = "(role = 'GUEST' and password is null) or (role in ('USER', 'ADMIN') and password is not null)")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 10)
    private String phone;

    @Column(unique = true, length = 50)
    private String username;

    @Column(length = 254)
    private String email;

    @JsonIgnore
    @Column(length = 255)
    private String password;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.GUEST;

    @Column(length = 500)
    private String address;
}
