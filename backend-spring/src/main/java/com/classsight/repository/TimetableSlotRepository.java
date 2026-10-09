package com.classsight.repository;

import com.classsight.entity.TimetableSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimetableSlotRepository extends JpaRepository<TimetableSlot, Long> {

    List<TimetableSlot> findByTerm_IdAndActiveTrue(Long termId);

    List<TimetableSlot> findByTerm_IdAndDayOfWeekAndActiveTrue(Long termId, int dayOfWeek);

    List<TimetableSlot> findByTerm_IdAndTeacher_IdAndActiveTrue(Long termId, Long teacherId);
}
