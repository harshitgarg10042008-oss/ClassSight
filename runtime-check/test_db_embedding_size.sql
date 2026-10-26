-- Part B.2: Check stored embedding sizes in DB
SELECT
    s.id,
    s.roll_number,
    s.first_name,
    s.last_name,
    array_length(s.face_embedding, 1) as legacy_embedding_size,
    (SELECT COUNT(*) FROM student_face_embeddings se WHERE se.student_id = s.id) as multi_ref_count
FROM students s
WHERE s.face_embedding IS NOT NULL
LIMIT 5;

-- Also check multi-reference table
SELECT
    se.id,
    se.student_id,
    s.roll_number,
    array_length(se.embedding_vector, 1) as multi_ref_embedding_size,
    se.model_version
FROM student_face_embeddings se
JOIN students s ON se.student_id = s.id
LIMIT 5;
