package com.classsight.repository;

import com.classsight.entity.FacultySubjectAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FacultySubjectAssignmentRepository extends JpaRepository<FacultySubjectAssignment, Long> {
    List<FacultySubjectAssignment> findByFacultyIdAndActiveTrue(Long facultyId);

    boolean existsByFacultyIdAndSubjectIdAndClassSectionIdAndActiveTrue(
            Long facultyId, Long subjectId, Long classSectionId);

    boolean existsBySubjectId(Long subjectId);
}
