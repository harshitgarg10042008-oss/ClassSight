package com.classsight.repository;

import com.classsight.entity.StudentEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentEnrollmentRepository extends JpaRepository<StudentEnrollment, Long> {

    /**
     * Returns enrolled students for a section and subject.
     * If a student has no subject-specific enrollment, they are included
     * when they have a section-level (null subject) enrollment.
     */
    @Query("""
        SELECT se FROM StudentEnrollment se
        WHERE se.active = TRUE
          AND se.classSection.id = :sectionId
          AND (se.subject IS NULL OR se.subject.id = :subjectId)
        """)
    List<StudentEnrollment> findEnrolledStudents(@Param("sectionId") Long sectionId,
                                                  @Param("subjectId") Long subjectId);

    List<StudentEnrollment> findByStudent_IdAndActiveTrue(Long studentId);
}
