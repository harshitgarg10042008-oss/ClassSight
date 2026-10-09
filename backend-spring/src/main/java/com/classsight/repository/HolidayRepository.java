package com.classsight.repository;

import com.classsight.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    @Query("""
        SELECT h FROM Holiday h
        WHERE h.date BETWEEN :from AND :to
          AND (h.term IS NULL OR h.term.id = :termId)
        ORDER BY h.date ASC
        """)
    List<Holiday> findHolidaysInRange(@Param("from") LocalDate from,
                                       @Param("to") LocalDate to,
                                       @Param("termId") Long termId);

    @Query("SELECT COUNT(h) > 0 FROM Holiday h WHERE h.date = :date AND (h.term IS NULL OR h.term.id = :termId)")
    boolean isHoliday(@Param("date") LocalDate date, @Param("termId") Long termId);
}
