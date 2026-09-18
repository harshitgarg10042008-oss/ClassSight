package com.classsight.service;

import com.classsight.entity.Student;
import com.classsight.repository.StudentRepository;
import jakarta.annotation.PostConstruct;
import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.objdetect.FaceDetectorYN;
import org.opencv.objdetect.FaceRecognizerSF;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Service
public class Phase1SFaceService {
    private static final Logger logger = LoggerFactory.getLogger(Phase1SFaceService.class);

    private final StudentRepository studentRepository;
    private final Path modelDir;
    private final String yunetModelName;
    private final String sfaceModelName;
    private final double confidenceThreshold;
    private final int detectorWidth;
    private final int detectorHeight;
    private final double scoreThreshold;
    private final double nmsThreshold;
    private final int topK;

    private volatile boolean initialized = false;
    private volatile String yunetModelPath;
    private volatile String sfaceModelPath;

    public Phase1SFaceService(
            StudentRepository studentRepository,
            @Value("${classsight.phase1.model-dir:./models}") String modelDir,
            @Value("${classsight.phase1.yunet-model:face_detection_yunet_2023mar.onnx}") String yunetModelName,
            @Value("${classsight.phase1.sface-model:face_recognition_sface_2021dec.onnx}") String sfaceModelName,
            @Value("${classsight.phase1.confidence-threshold:0.50}") double confidenceThreshold,
            @Value("${classsight.phase1.detector-input-width:320}") int detectorWidth,
            @Value("${classsight.phase1.detector-input-height:320}") int detectorHeight,
            @Value("${classsight.phase1.score-threshold:0.9}") double scoreThreshold,
            @Value("${classsight.phase1.nms-threshold:0.3}") double nmsThreshold,
            @Value("${classsight.phase1.top-k:5000}") int topK) {
        this.studentRepository = studentRepository;
        this.modelDir = Path.of(modelDir).toAbsolutePath().normalize();
        this.yunetModelName = yunetModelName;
        this.sfaceModelName = sfaceModelName;
        this.confidenceThreshold = confidenceThreshold;
        this.detectorWidth = detectorWidth;
        this.detectorHeight = detectorHeight;
        this.scoreThreshold = scoreThreshold;
        this.nmsThreshold = nmsThreshold;
        this.topK = topK;
    }

    @PostConstruct
    public void initialize() {
        try {
            nu.pattern.OpenCV.loadLocally();
            this.yunetModelPath = modelDir.resolve(yunetModelName).toString();
            this.sfaceModelPath = modelDir.resolve(sfaceModelName).toString();

            if (!Files.exists(Path.of(yunetModelPath))) {
                throw new IllegalStateException("Missing YuNet ONNX model at " + yunetModelPath
                        + ". Download the OpenCV model assets before enabling ClassSight Phase 1.");
            }
            if (!Files.exists(Path.of(sfaceModelPath))) {
                throw new IllegalStateException("Missing SFace ONNX model at " + sfaceModelPath
                        + ". Download the OpenCV model assets before enabling ClassSight Phase 1.");
            }
            this.initialized = true;
            logger.info("Phase 1 OpenCV SFace pipeline initialized with YuNet {} and SFace {}", yunetModelPath,
                    sfaceModelPath);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to initialize Phase 1 OpenCV SFace pipeline", ex);
        }
    }

    public boolean enabled() {
        return initialized;
    }

    public List<Double> enrollFace(MultipartFile photo) throws IOException {
        if (!initialized) {
            throw new IllegalStateException("Phase 1 OpenCV SFace pipeline is not initialized");
        }
        Mat image = loadMat(photo);
        MatOfRect faceBoxes = new MatOfRect();
        FaceDetectorYN detector = FaceDetectorYN.create(yunetModelPath, "", new Size(detectorWidth, detectorHeight),
                (float) scoreThreshold, (float) nmsThreshold, topK);
        detector.setInputSize(new Size(image.cols(), image.rows()));
        detector.detect(image, faceBoxes);
        if (faceBoxes.empty()) {
            throw new IllegalArgumentException("No face detected in the image");
        }
        Rect faceRect = faceBoxes.toArray()[0];
        Mat faceCrop = extractFaceCrop(image, faceRect);
        return toDoubleList(featureVector(faceCrop));
    }

    public SFaceRecognitionResponse recognize(MultipartFile photo, List<StudentReference> enrolledStudents)
            throws IOException {
        if (!initialized) {
            throw new IllegalStateException("Phase 1 OpenCV SFace pipeline is not initialized");
        }
        Mat image = loadMat(photo);
        MatOfRect faceBoxes = new MatOfRect();
        FaceDetectorYN detector = FaceDetectorYN.create(yunetModelPath, "", new Size(detectorWidth, detectorHeight),
                (float) scoreThreshold, (float) nmsThreshold, topK);
        detector.setInputSize(new Size(image.cols(), image.rows()));
        detector.detect(image, faceBoxes);
        List<SFaceFaceMatch> matches = new ArrayList<>();
        List<String> globalWarnings = qualityWarnings(image, faceBoxes.toArray());

        if (enrolledStudents == null || enrolledStudents.isEmpty()) {
            for (int idx = 0; idx < faceBoxes.toArray().length; idx++) {
                matches.add(
                        SFaceFaceMatch.unknown(idx, faceSizeRatio(image, faceBoxes.toArray()[idx]), globalWarnings));
            }
            return new SFaceRecognitionResponse(faceBoxes.toArray().length, matches,
                    new QualityMetrics(globalWarnings, qualityFor(image, faceBoxes.toArray())),
                    "Phase 1 SFace recognize without enrolled students");
        }

        for (int idx = 0; idx < faceBoxes.toArray().length; idx++) {
            Rect rect = faceBoxes.toArray()[idx];
            Mat faceCrop = extractFaceCrop(image, rect);
            Mat embedding = featureVector(faceCrop);
            double bestCosine = Double.NEGATIVE_INFINITY;
            StudentReference best = null;
            for (StudentReference candidate : enrolledStudents) {
                double sim = cosineSimilarity(embedding, candidate.embedding());
                if (sim > bestCosine) {
                    bestCosine = sim;
                    best = candidate;
                }
            }
            if (best == null || bestCosine <= confidenceThreshold) {
                matches.add(SFaceFaceMatch.noMatch(idx, faceSizeRatio(image, rect), globalWarnings));
            } else {
                matches.add(SFaceFaceMatch.match(idx, best, bestCosine, faceSizeRatio(image, rect), globalWarnings));
            }
        }
        return new SFaceRecognitionResponse(faceBoxes.toArray().length, matches,
                new QualityMetrics(globalWarnings, qualityFor(image, faceBoxes.toArray())),
                "Phase 1 SFace recognition complete");
    }

    public StudentReference buildReference(Student student) {
        if (student.getFaceEmbeddingSface() == null || student.getFaceEmbeddingSface().isEmpty()) {
            throw new IllegalArgumentException("Student " + student.getRollNumber() + " has no SFace embedding");
        }
        return new StudentReference(student.getId(), student.getRollNumber(), student.getFaceEmbeddingSface());
    }

    public void persistSFaceEmbedding(Student student, List<Double> embedding) {
        student.setFaceEmbeddingSface(embedding);
        student.addFaceEmbeddingV2(embedding);
        studentRepository.save(student);
    }

    private Mat loadMat(MultipartFile image) throws IOException {
        byte[] bytes = image.getBytes();
        Mat mat = Imgcodecs.imdecode(new MatOfByte(bytes), Imgcodecs.IMREAD_COLOR);
        if (mat.empty()) {
            throw new IllegalArgumentException("Unable to decode uploaded image");
        }
        return mat;
    }

    private Mat extractFaceCrop(Mat image, Rect box) {
        Mat face = new Mat(image, box);
        Mat aligned = new Mat();
        Imgproc.cvtColor(face, aligned, Imgproc.COLOR_BGR2RGB);
        return aligned;
    }

    private Mat featureVector(Mat faceCrop) {
        FaceRecognizerSF recognizer = FaceRecognizerSF.create(sfaceModelPath, "");
        Mat embedding = new Mat();
        recognizer.feature(faceCrop, embedding);
        return embedding;
    }

    private double cosineSimilarity(Mat left, List<Double> right) {
        double[] leftArr = new double[(int) (left.total() * left.channels())];
        left.get(0, 0, leftArr);
        double sum = 0.0;
        double leftNorm = 0.0;
        double rightNorm = 0.0;
        for (int i = 0; i < leftArr.length; i++) {
            double rv = right.get(i);
            sum += leftArr[i] * rv;
            leftNorm += leftArr[i] * leftArr[i];
            rightNorm += rv * rv;
        }
        if (leftNorm <= 0.0 || rightNorm <= 0.0) {
            return 0.0;
        }
        return sum / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }

    private List<Double> toDoubleList(Mat embedding) {
        double[] values = new double[(int) (embedding.total() * embedding.channels())];
        embedding.get(0, 0, values);
        List<Double> result = new ArrayList<>();
        for (double value : values) {
            result.add(value);
        }
        return result;
    }

    private double faceSizeRatio(Mat image, Rect rect) {
        double h = image.rows();
        double w = image.cols();
        double area = Math.max(0, rect.width) * Math.max(0, rect.height);
        return area / (h * w);
    }

    private double[] qualityFor(Mat image, Rect[] boxes) {
        if (boxes == null || boxes.length == 0) {
            return new double[] { 0.0, 0.0, 0.0, 0.0 };
        }
        double[] quality = new double[] { 0.0, 0.0, 0.0, 0.0 };
        Mat gray = new Mat();
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY);
        Mat lap = new Mat();
        Imgproc.Laplacian(gray, lap, CvType.CV_64F);
        double blurScore = Core.mean(lap).val[0];
        double brightnessMean = Core.mean(gray).val[0];
        double texture = 0.0;
        if (gray.rows() > 0 && gray.cols() > 0) {
            Mat blurred = new Mat();
            Imgproc.GaussianBlur(gray, blurred, new Size(5, 5), 0);
            Mat diff = new Mat();
            Core.subtract(gray, blurred, diff);
            texture = Core.mean(diff).val[0];
        }
        quality[0] = blurScore;
        quality[1] = brightnessMean;
        quality[2] = texture;
        quality[3] = faceSizeRatio(image, boxes[0]);
        return quality;
    }

    private List<String> qualityWarnings(Mat image, Rect[] boxes) {
        List<String> warnings = new ArrayList<>();
        double[] quality = qualityFor(image, boxes);
        if (quality[0] < 30.0) {
            warnings.add("image blurry (blur_score=" + quality[0] + ", threshold=30.0)");
        }
        if (quality[1] < 35.0) {
            warnings.add("image too dark (brightness=" + quality[1] + ")");
        } else if (quality[1] > 220.0) {
            warnings.add("image overexposed (brightness=" + quality[1] + ")");
        }
        if (quality[2] < 2.5) {
            warnings.add("weak liveness texture signal (texture=" + quality[2] + ")");
        }
        if (quality[3] < 0.0005) {
            warnings.add("face too small (ratio=" + quality[3] + ", threshold=0.0005)");
        }
        return warnings;
    }

    public record StudentReference(Long studentId, String rollNumber, List<Double> embedding) {
    }

    public record SFaceFaceMatch(int faceIndex, Long studentId, String rollNumber, double confidenceScore,
            String confidenceLabel, boolean matched, double faceSizeRatio, List<String> qualityWarnings,
            String recognitionState, int frameConfirmations) {
        public static SFaceFaceMatch match(int faceIndex, StudentReference candidate, double cosine, double ratio,
                List<String> globalWarnings) {
            String label = cosine >= 0.80 ? "HIGH" : cosine >= 0.65 ? "MEDIUM" : "LOW";
            List<String> warnings = new ArrayList<>(globalWarnings);
            return new SFaceFaceMatch(faceIndex, candidate.studentId(), candidate.rollNumber(),
                    normalizeConfidence(cosine), label, true, ratio, warnings, "RECOGNIZED", 1);
        }

        public static SFaceFaceMatch noMatch(int faceIndex, double ratio, List<String> globalWarnings) {
            List<String> warnings = new ArrayList<>(globalWarnings);
            return new SFaceFaceMatch(faceIndex, null, null, 0.0, "LOW", false, ratio, warnings, "LOW_CONFIDENCE", 0);
        }

        public static SFaceFaceMatch unknown(int faceIndex, double ratio, List<String> globalWarnings) {
            List<String> warnings = new ArrayList<>(globalWarnings);
            return new SFaceFaceMatch(faceIndex, null, null, 0.0, "UNKNOWN", false, ratio, warnings, "UNKNOWN", 0);
        }

        private static double normalizeConfidence(double cosine) {
            return Math.max(0.0, Math.min(1.0, (cosine + 1.0) / 2.0));
        }
    }

    public record QualityMetrics(List<String> warnings, double[] quality) {
        public boolean qualityPassed() {
            return warnings == null || warnings.isEmpty();
        }
    }

    public record SFaceRecognitionResponse(int faceCount, List<SFaceFaceMatch> matches, QualityMetrics quality,
            String message) {
    }
}
