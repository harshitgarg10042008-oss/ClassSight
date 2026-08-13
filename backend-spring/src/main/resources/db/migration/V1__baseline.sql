--
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id bigint NOT NULL,
    confidence_score numeric(5,4),
    created_at timestamp(6) without time zone NOT NULL,
    face_size_ratio double precision,
    quality_warning character varying(2000),
    review_status smallint,
    reviewed_at timestamp(6) without time zone,
    reviewed_by bigint,
    status character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    session_id bigint NOT NULL,
    student_id bigint NOT NULL,
    CONSTRAINT attendance_records_review_status_check CHECK (((review_status >= 0) AND (review_status <= 2))),
    CONSTRAINT attendance_records_status_check CHECK (((status)::text = ANY ((ARRAY['PRESENT'::character varying, 'ABSENT'::character varying, 'REVIEW'::character varying])::text[])))
);


--
-- Name: attendance_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_records_id_seq OWNED BY public.attendance_records.id;


--
-- Name: attendance_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_sessions (
    id bigint NOT NULL,
    blur_score double precision,
    brightness_mean double precision,
    captured_photo_path character varying(1024),
    created_at timestamp(6) without time zone NOT NULL,
    ended_at timestamp(6) without time zone,
    liveness_score double precision,
    quality_passed boolean,
    quality_warning character varying(2000),
    started_at timestamp(6) without time zone,
    status character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    camera_id bigint NOT NULL,
    class_section_id bigint NOT NULL,
    faculty_id bigint NOT NULL,
    room_id bigint NOT NULL,
    subject_id bigint NOT NULL,
    CONSTRAINT attendance_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'CAPTURED'::character varying, 'PROCESSING'::character varying, 'REVIEW_REQUIRED'::character varying, 'FINALIZED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_sessions_id_seq OWNED BY public.attendance_sessions.id;


--
-- Name: cameras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cameras (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    name character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    room_id bigint NOT NULL,
    credentials_ciphertext character varying(4096),
    last_checked_at timestamp(6) without time zone,
    last_error character varying(2000),
    stream_url character varying(1024),
    CONSTRAINT cameras_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'MAINTENANCE'::character varying, 'ONLINE'::character varying, 'OFFLINE'::character varying])::text[])))
);


--
-- Name: cameras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cameras_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cameras_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cameras_id_seq OWNED BY public.cameras.id;


--
-- Name: class_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_sections (
    id bigint NOT NULL,
    academic_year integer NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    description character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);


--
-- Name: class_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_sections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_sections_id_seq OWNED BY public.class_sections.id;


--
-- Name: erp_sync_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_sync_audits (
    id bigint NOT NULL,
    actor character varying(120) NOT NULL,
    from_status character varying(20),
    note character varying(4000),
    to_status character varying(20) NOT NULL,
    transitioned_at timestamp(6) without time zone NOT NULL,
    sync_record_id bigint NOT NULL
);


--
-- Name: erp_sync_audits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.erp_sync_audits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: erp_sync_audits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.erp_sync_audits_id_seq OWNED BY public.erp_sync_audits.id;


--
-- Name: erp_sync_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_sync_records (
    id bigint NOT NULL,
    actor character varying(120) NOT NULL,
    attempt_count integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    export_path character varying(1024),
    last_error character varying(4000),
    status character varying(20) NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    session_id bigint NOT NULL,
    CONSTRAINT erp_sync_records_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SYNCING'::character varying, 'SYNCED'::character varying, 'FAILED'::character varying, 'PARTIAL'::character varying])::text[])))
);


--
-- Name: erp_sync_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.erp_sync_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: erp_sync_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.erp_sync_records_id_seq OWNED BY public.erp_sync_records.id;


--
-- Name: faculty_subject_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculty_subject_assignments (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    class_section_id bigint NOT NULL,
    faculty_id bigint NOT NULL,
    subject_id bigint NOT NULL
);


--
-- Name: faculty_subject_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faculty_subject_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faculty_subject_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faculty_subject_assignments_id_seq OWNED BY public.faculty_subject_assignments.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id bigint NOT NULL,
    active boolean NOT NULL,
    building character varying(255),
    capacity integer,
    created_at timestamp(6) without time zone NOT NULL,
    floor integer,
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);


--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rooms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id bigint NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    date_of_birth date,
    face_embedding double precision[],
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    roll_number character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    class_section_id bigint NOT NULL
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id bigint NOT NULL,
    active boolean NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    description character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    email character varying(255) NOT NULL,
    enabled boolean NOT NULL,
    full_name character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    username character varying(255) NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'TEACHER'::character varying, 'STUDENT'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendance_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records ALTER COLUMN id SET DEFAULT nextval('public.attendance_records_id_seq'::regclass);


--
-- Name: attendance_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions ALTER COLUMN id SET DEFAULT nextval('public.attendance_sessions_id_seq'::regclass);


--
-- Name: cameras id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cameras ALTER COLUMN id SET DEFAULT nextval('public.cameras_id_seq'::regclass);


--
-- Name: class_sections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sections ALTER COLUMN id SET DEFAULT nextval('public.class_sections_id_seq'::regclass);


--
-- Name: erp_sync_audits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_audits ALTER COLUMN id SET DEFAULT nextval('public.erp_sync_audits_id_seq'::regclass);


--
-- Name: erp_sync_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_records ALTER COLUMN id SET DEFAULT nextval('public.erp_sync_records_id_seq'::regclass);


--
-- Name: faculty_subject_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subject_assignments ALTER COLUMN id SET DEFAULT nextval('public.faculty_subject_assignments_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_sessions attendance_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id);


--
-- Name: cameras cameras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cameras
    ADD CONSTRAINT cameras_pkey PRIMARY KEY (id);


--
-- Name: class_sections class_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_pkey PRIMARY KEY (id);


--
-- Name: erp_sync_audits erp_sync_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_audits
    ADD CONSTRAINT erp_sync_audits_pkey PRIMARY KEY (id);


--
-- Name: erp_sync_records erp_sync_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_records
    ADD CONSTRAINT erp_sync_records_pkey PRIMARY KEY (id);


--
-- Name: faculty_subject_assignments faculty_subject_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT faculty_subject_assignments_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: rooms uk_1kuqhbfxed2e8t571uo82n545; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT uk_1kuqhbfxed2e8t571uo82n545 UNIQUE (name);


--
-- Name: class_sections uk_36llb4qsuww02pb37t7ad1ani; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT uk_36llb4qsuww02pb37t7ad1ani UNIQUE (name);


--
-- Name: users uk_6dotkott2kjsp8vw4d0m25fb7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_6dotkott2kjsp8vw4d0m25fb7 UNIQUE (email);


--
-- Name: erp_sync_records uk_erp_sync_session; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_records
    ADD CONSTRAINT uk_erp_sync_session UNIQUE (session_id);


--
-- Name: students uk_kmd86jf46110c60b412tjt2bg; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT uk_kmd86jf46110c60b412tjt2bg UNIQUE (roll_number);


--
-- Name: users uk_r43af9ap4edm43mmtq01oddj6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_r43af9ap4edm43mmtq01oddj6 UNIQUE (username);


--
-- Name: subjects uk_rg7x1lyii7kdyycw98d45vep5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT uk_rg7x1lyii7kdyycw98d45vep5 UNIQUE (code);


--
-- Name: erp_sync_records uk_sck0ibkd4prsmtbvnjyg4ebay; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_records
    ADD CONSTRAINT uk_sck0ibkd4prsmtbvnjyg4ebay UNIQUE (session_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: faculty_subject_assignments fk1ovjbtugfjuq67h3279w0lrho; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT fk1ovjbtugfjuq67h3279w0lrho FOREIGN KEY (class_section_id) REFERENCES public.class_sections(id);


--
-- Name: faculty_subject_assignments fk2k8o2mijo595s2t7hdnw02out; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT fk2k8o2mijo595s2t7hdnw02out FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: attendance_records fkb5ijilkgrgx66qn66iajdkyb9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT fkb5ijilkgrgx66qn66iajdkyb9 FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: cameras fkbwa3lg6oc9tq2py7w7dtxlv25; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cameras
    ADD CONSTRAINT fkbwa3lg6oc9tq2py7w7dtxlv25 FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: attendance_sessions fkcrr0spc6bq7dcg905brk676sh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT fkcrr0spc6bq7dcg905brk676sh FOREIGN KEY (camera_id) REFERENCES public.cameras(id);


--
-- Name: attendance_sessions fkdn9m3a6e7swohh0510n5kfrjj; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT fkdn9m3a6e7swohh0510n5kfrjj FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: attendance_records fkfaf92mkjrosrvdqq5bev7cl1m; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT fkfaf92mkjrosrvdqq5bev7cl1m FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id);


--
-- Name: erp_sync_audits fkh4ll7uvg66qduakp8kuopnern; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_audits
    ADD CONSTRAINT fkh4ll7uvg66qduakp8kuopnern FOREIGN KEY (sync_record_id) REFERENCES public.erp_sync_records(id);


--
-- Name: attendance_sessions fkh9g7i6145bonawbqhd3u0kdri; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT fkh9g7i6145bonawbqhd3u0kdri FOREIGN KEY (class_section_id) REFERENCES public.class_sections(id);


--
-- Name: attendance_sessions fkl1pmdjkbn1vmrsd59xopgiyj7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT fkl1pmdjkbn1vmrsd59xopgiyj7 FOREIGN KEY (faculty_id) REFERENCES public.users(id);


--
-- Name: faculty_subject_assignments fkrdkm57qnr11m328wh3g70i0lk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_subject_assignments
    ADD CONSTRAINT fkrdkm57qnr11m328wh3g70i0lk FOREIGN KEY (faculty_id) REFERENCES public.users(id);


--
-- Name: students fksi1sa580rjsyreh5f67si6kpl; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT fksi1sa580rjsyreh5f67si6kpl FOREIGN KEY (class_section_id) REFERENCES public.class_sections(id);


--
-- Name: erp_sync_records fktcgei7rtbpx9x3mi0ilggyxa0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_records
    ADD CONSTRAINT fktcgei7rtbpx9x3mi0ilggyxa0 FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id);


--
-- Name: attendance_sessions fktmnjvpihnvxc69vgbe689o2a7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT fktmnjvpihnvxc69vgbe689o2a7 FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- PostgreSQL database dump complete
--
