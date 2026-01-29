/**
 * Face Verification Service
 * Handles face comparison and verification for pointage system
 */

import { query, execute } from "@/lib/mysql-direct";
import { auditLogger } from "./audit-logger";
import { securityService } from "./security-service";

export interface FaceVerificationResult {
  isMatch: boolean;
  confidence: number; // 0-100
  reason?: string;
}

export interface CapturePhotoData {
  photoData: string; // base64 encoded image
  captureMethod: "camera" | "upload";
  timestamp: Date;
  deviceInfo?: any;
}

class FaceVerificationService {
  private readonly CONFIDENCE_THRESHOLD = 75; // Minimum confidence for match
  private readonly LOW_CONFIDENCE_THRESHOLD = 60; // Threshold for review

  /**
   * Verify face against user's profile photo
   * 
   * In production, this would use a real face recognition API like:
   * - AWS Rekognition
   * - Azure Face API
   * - Face++
   * - Custom ML model
   * 
   * For now, we implement a mock with intelligent fallback
   */
  async verifyFace(
    userId: string,
    capturedPhoto: string
  ): Promise<FaceVerificationResult> {
    try {
      // Get user's reference photo from Employe table
      const employes = await query(
        `SELECT photo, nom, prenom FROM Employe WHERE userId = ? LIMIT 1`,
        [userId]
      ) as any[];
      const employe = employes[0];

      if (!employe || !employe.photo) {
        return {
          isMatch: false,
          confidence: 0,
          reason: "No reference photo found",
        };
      }

      // In production, call real face recognition API
      // const result = await this.callFaceRecognitionAPI(employe.photo, capturedPhoto);
      
      // For development: Mock verification with intelligent rules
      const mockResult = await this.mockFaceVerification(
        employe.photo,
        capturedPhoto
      );

      // Log verification attempt
      await auditLogger.log({
        action: "FACE_VERIFICATION_ATTEMPT",
        userId,
        entityType: "POINTAGE",
        metadata: JSON.stringify({
          confidence: mockResult.confidence,
          isMatch: mockResult.isMatch,
          method: "mock",
        }),
        severity: mockResult.isMatch ? "INFO" : "WARNING",
      });

      return mockResult;
    } catch (error) {
      console.error("Face verification error:", error);
      
      await auditLogger.log({
        action: "FACE_VERIFICATION_ERROR",
        userId,
        entityType: "POINTAGE",
        metadata: JSON.stringify({ error: String(error) }),
        severity: "ERROR",
      });

      return {
        isMatch: false,
        confidence: 0,
        reason: "Verification service error",
      };
    }
  }

  /**
   * Mock face verification (for development)
   * Replace with real API in production
   */
  private async mockFaceVerification(
    referencePhoto: string,
    capturedPhoto: string
  ): Promise<FaceVerificationResult> {
    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if photos are similar (basic check on data size)
    const refSize = referencePhoto.length;
    const capSize = capturedPhoto.length;
    const sizeDifference = Math.abs(refSize - capSize) / Math.max(refSize, capSize);

    // Generate mock confidence based on size similarity and random factor
    // In production, this would be real ML confidence score
    const baseConfidence = 100 - sizeDifference * 50;
    const randomFactor = (Math.random() - 0.5) * 20; // ±10%
    const confidence = Math.max(0, Math.min(100, baseConfidence + randomFactor));

    const isMatch = confidence >= this.CONFIDENCE_THRESHOLD;

    return {
      isMatch,
      confidence: Math.round(confidence),
      reason: isMatch
        ? "Face matched successfully"
        : confidence >= this.LOW_CONFIDENCE_THRESHOLD
        ? "Low confidence - requires review"
        : "Face does not match",
    };
  }

  /**
   * Call real face recognition API (AWS Rekognition example)
   * Uncomment and configure in production
   */
  /*
  private async callFaceRecognitionAPI(
    referencePhoto: string,
    capturedPhoto: string
  ): Promise<FaceVerificationResult> {
    const AWS = require('aws-sdk');
    const rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    // Convert base64 to buffer
    const refBuffer = Buffer.from(referencePhoto.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const capBuffer = Buffer.from(capturedPhoto.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const params = {
      SourceImage: { Bytes: refBuffer },
      TargetImage: { Bytes: capBuffer },
      SimilarityThreshold: this.CONFIDENCE_THRESHOLD,
    };

    try {
      const result = await rekognition.compareFaces(params).promise();
      
      if (result.FaceMatches && result.FaceMatches.length > 0) {
        const match = result.FaceMatches[0];
        return {
          isMatch: true,
          confidence: match.Similarity,
          reason: 'Face matched by AWS Rekognition',
        };
      }

      return {
        isMatch: false,
        confidence: 0,
        reason: 'No face match found',
      };
    } catch (error) {
      throw new Error(`AWS Rekognition error: ${error.message}`);
    }
  }
  */

  /**
   * Validate captured photo quality
   */
  async validatePhotoQuality(photoData: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check if photo is base64
    if (!photoData.startsWith("data:image/")) {
      issues.push("Invalid image format");
    }

    // Check size (should be reasonable, not too small or too large)
    const sizeInBytes = (photoData.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB < 0.01) {
      issues.push("Image too small (< 10KB)");
    }

    if (sizeInMB > 10) {
      issues.push("Image too large (> 10MB)");
    }

    // In production, add more checks:
    // - Face detection (ensure a face is present)
    // - Image clarity (blur detection)
    // - Lighting conditions
    // - Image dimensions

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Store verified pointage with photo
   */
  async storeVerifiedPointage(
    userId: string,
    type: "IN" | "OUT",
    captureData: CapturePhotoData,
    verificationResult: FaceVerificationResult,
    deviceFingerprintId?: string,
    ipAddress?: string
  ): Promise<string> {
    // Determine if anomaly should be created
    const anomalyDetected =
      !verificationResult.isMatch ||
      verificationResult.confidence < this.CONFIDENCE_THRESHOLD;

    const anomalyReason = anomalyDetected
      ? `Face verification ${verificationResult.confidence < this.LOW_CONFIDENCE_THRESHOLD
          ? "failed"
          : "requires review"}: ${verificationResult.reason}`
      : null;

    // Determine status
    const status = verificationResult.isMatch
      ? "VALID"
      : verificationResult.confidence >= this.LOW_CONFIDENCE_THRESHOLD
      ? "PENDING_REVIEW"
      : "REJECTED";

    // Create pointage
    const pointageId = `ptg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await execute(
      `INSERT INTO Pointage (id, user_id, type, timestamp, capturedPhoto, face_verified, verificationScore, anomaly_detected, anomaly_reason, status, deviceFingerprintId, ip_address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pointageId,
        userId,
        type,
        captureData.timestamp,
        captureData.photoData,
        verificationResult.isMatch ? 1 : 0,
        verificationResult.confidence,
        anomalyDetected ? 1 : 0,
        anomalyReason,
        status,
        deviceFingerprintId || null,
        ipAddress || null,
        JSON.stringify({
          captureMethod: captureData.captureMethod,
          deviceInfo: captureData.deviceInfo,
        }),
      ]
    );

    // Log pointage
    await auditLogger.log({
      action: `POINTAGE_${type}`,
      userId,
      entityType: "POINTAGE",
      entityId: pointageId,
      metadata: JSON.stringify({
        faceVerified: verificationResult.isMatch,
        confidence: verificationResult.confidence,
        anomalyDetected,
        captureMethod: captureData.captureMethod,
      }),
      severity: anomalyDetected ? "WARNING" : "INFO",
    });

    // Create anomaly if detected
    if (anomalyDetected) {
      await securityService.createAnomaly(
        "FACE_VERIFICATION_FAIL",
        verificationResult.confidence < this.LOW_CONFIDENCE_THRESHOLD
          ? "HIGH"
          : "MEDIUM",
        "POINTAGE",
        pointageId,
        anomalyReason || "Face verification anomaly",
        {
          userId,
          confidence: verificationResult.confidence,
          type,
          timestamp: captureData.timestamp,
        }
      );
    }

    return pointageId;
  }

  /**
   * Get user's recent pointages for analysis
   */
  async getRecentPointages(userId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await query(
      `SELECT id, type, timestamp, face_verified as faceVerified, verificationScore, anomaly_detected as anomalyDetected, status
       FROM Pointage WHERE user_id = ? AND timestamp >= ? ORDER BY timestamp DESC`,
      [userId, since]
    ) as any[];
  }

  /**
   * Compress and optimize photo for storage
   */
  async optimizePhoto(photoData: string): Promise<string> {
    // In production, implement actual image compression
    // using libraries like sharp or jimp
    
    // For now, just ensure it's base64
    if (!photoData.startsWith("data:image/")) {
      return `data:image/jpeg;base64,${photoData}`;
    }

    return photoData;
  }

  /**
   * Extract face from photo (for ML training/comparison)
   * This would use face detection to crop the face region
   */
  async extractFace(photoData: string): Promise<string | null> {
    // In production, use face detection API to extract face region
    // For now, return original photo
    return photoData;
  }
}

export const faceVerificationService = new FaceVerificationService();
