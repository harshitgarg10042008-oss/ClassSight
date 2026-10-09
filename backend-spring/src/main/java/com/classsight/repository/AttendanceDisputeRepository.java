package com.classsight.repository;

import com.classsight.entity.AttendanceDispute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceDisputeRepository extends JpaRepository<AttendanceDispute, Long> {
    List<AttendanceDispute> findByStudent_IdOrderByCreatedAtDesc(Long studentId);
    List<AttendanceDispute> findByStatusOrderByCreatedAtDesc(AttendanceDispute.DisputeStatus status);
}
