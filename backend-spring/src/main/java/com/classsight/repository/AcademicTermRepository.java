package com.classsight.repository;

import com.classsight.entity.AcademicTerm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AcademicTermRepository extends JpaRepository<AcademicTerm, Long> {

    Optional<AcademicTerm> findByActiveTrue();
}
