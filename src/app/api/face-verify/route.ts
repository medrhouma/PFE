import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/mysql-direct";
import { checkRateLimit, getClientIP, withSecurityHeaders } from "@/lib/security-middleware";
import { auditLogger } from "@/lib/services/audit-logger";

/**
 * Face Verification Service
 * This endpoint verifies if a captured photo contains a valid human face
 * 
 * In production, integrate with:
 * - Azure Face API
 * - AWS Rekognition
 * - Face++ API
 * - Or a custom ML model
 */

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for face verification
    const ip = getClientIP(request);
    const { allowed, remaining } = checkRateLimit(`face-verify:${ip}`, "face-verify");
    
    if (!allowed) {
      return withSecurityHeaders(NextResponse.json({ 
        error: "Trop de tentatives de vérification. Veuillez attendre.",
        verified: false,
        reason: "RATE_LIMITED"
      }, { status: 429 }));
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userAgent = request.headers.get("user-agent") || undefined;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ 
        error: "Image requise",
        verified: false,
        reason: "NO_IMAGE"
      }, { status: 400 });
    }

    if (!image.startsWith("data:image")) {
      return NextResponse.json({
        error: "Format d'image invalide",
        verified: false,
        reason: "INVALID_FORMAT"
      }, { status: 400 });
    }

    const imageSize = image.length;
    if (imageSize < 1000) {
      return NextResponse.json({
        verified: false,
        reason: "IMAGE_TOO_SMALL",
        message: "L'image est trop petite. Assurez-vous de capturer votre visage correctement."
      });
    }

    if (imageSize > 10000000) {
      return NextResponse.json({
        verified: false,
        reason: "IMAGE_TOO_LARGE",
        message: "L'image est trop grande. Veuillez réessayer."
      });
    }

    const provider = (process.env.FACE_PROVIDER || "mock").toLowerCase();
    const requireMatch = process.env.FACE_VERIFY_REQUIRE_MATCH === "true";
    const threshold = Number(process.env.FACE_VERIFY_THRESHOLD || 0.75);

    // Mock provider for development/testing only
    if (provider === "mock" || !provider || provider === "") {
      // Block mock mode in production
      if (process.env.NODE_ENV === "production") {
        console.error("❌ Mock face verification attempted in production");
        await auditLogger.log({
          userId: session.user.id!,
          action: "FACE_VERIFY_MOCK_BLOCKED",
          entityType: "Security",
          ipAddress: ip,
          userAgent,
          severity: "ERROR",
          metadata: JSON.stringify({ reason: "Mock provider blocked in production" })
        });
        
        return withSecurityHeaders(NextResponse.json({
          verified: false,
          reason: "SERVICE_UNAVAILABLE",
          message: "Service de vérification faciale temporairement indisponible. Veuillez contacter l'administrateur."
        }, { status: 503 }));
      }

      // Development mode - return mock success
      await auditLogger.logFaceVerification(
        session.user.id!,
        true,
        ip,
        userAgent,
        { confidence: 0.95, mode: "mock" }
      );
      
      return withSecurityHeaders(NextResponse.json({
        verified: true,
        match: true,
        mode: "detect",
        confidence: 0.95,
        faceDetected: true,
        faceCount: 1,
        message: "Visage vérifié avec succès (mode développement)",
        timestamp: new Date().toISOString()
      }));
    }

    const imageBuffer = Buffer.from(image.split(",")[1], "base64");

    const getReferenceImage = async () => {
      const users: any = await query("SELECT image FROM User WHERE id = ? LIMIT 1", [session.user.id]);
      const ref = users?.[0]?.image as string | undefined;
      if (!ref) return null;

      if (ref.startsWith("data:image")) {
        return Buffer.from(ref.split(",")[1], "base64");
      }

      try {
        const resp = await fetch(ref);
        if (!resp.ok) return null;
        const arrayBuffer = await resp.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch {
        return null;
      }
    };

    if (provider === "azure") {
      const faceApiKey = process.env.AZURE_FACE_API_KEY;
      const faceApiEndpoint = process.env.AZURE_FACE_API_ENDPOINT;

      if (!faceApiKey || !faceApiEndpoint) {
        return NextResponse.json({
          verified: false,
          reason: "AZURE_NOT_CONFIGURED",
          message: "Azure Face API n'est pas configuré."
        }, { status: 503 });
      }

      const detectResponse = await fetch(
        `${faceApiEndpoint}/face/v1.0/detect?returnFaceId=true&returnFaceAttributes=qualityForRecognition`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": faceApiKey,
            "Content-Type": "application/octet-stream",
          },
          body: imageBuffer,
        }
      );

      const faces = await detectResponse.json();
      if (!detectResponse.ok) {
        return NextResponse.json({
          verified: false,
          reason: "AZURE_ERROR",
          message: faces?.error?.message || "Erreur Azure Face API"
        }, { status: 502 });
      }

      if (!faces || faces.length === 0) {
        return NextResponse.json({
          verified: false,
          reason: "NO_FACE_DETECTED",
          message: "Aucun visage détecté. Veuillez vous positionner face à la caméra."
        });
      }

      if (faces.length > 1) {
        return NextResponse.json({
          verified: false,
          reason: "MULTIPLE_FACES",
          message: "Plusieurs visages détectés. Assurez-vous d'être seul dans le cadre."
        });
      }

      const faceId = faces[0]?.faceId;
      let match = true;
      let confidence = 0.9;
      let mode: "detect" | "compare" = "detect";

      if (requireMatch) {
        const refBuffer = await getReferenceImage();
        if (!refBuffer) {
          return NextResponse.json({
            verified: false,
            reason: "NO_REFERENCE",
            message: "Aucune image de référence disponible pour vérifier l'identité."
          });
        }

        mode = "compare";

        const refDetect = await fetch(
          `${faceApiEndpoint}/face/v1.0/detect?returnFaceId=true`,
          {
            method: "POST",
            headers: {
              "Ocp-Apim-Subscription-Key": faceApiKey,
              "Content-Type": "application/octet-stream",
            },
            body: refBuffer,
          }
        );

        const refFaces = await refDetect.json();
        if (!refDetect.ok || !refFaces?.[0]?.faceId) {
          return NextResponse.json({
            verified: false,
            reason: "REFERENCE_INVALID",
            message: "Image de référence invalide."
          });
        }

        const verifyResponse = await fetch(`${faceApiEndpoint}/face/v1.0/verify`, {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": faceApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            faceId1: faceId,
            faceId2: refFaces[0].faceId,
          }),
        });

        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) {
          return NextResponse.json({
            verified: false,
            reason: "AZURE_VERIFY_ERROR",
            message: verifyData?.error?.message || "Erreur Azure Verify"
          }, { status: 502 });
        }

        confidence = verifyData.confidence || 0;
        match = Boolean(verifyData.isIdentical && confidence >= threshold);
      }

      return NextResponse.json({
        verified: match,
        match,
        mode,
        confidence,
        faceDetected: true,
        faceCount: 1,
        message: match ? "Visage vérifié avec succès" : "Visage non reconnu",
        timestamp: new Date().toISOString()
      });
    }

    if (provider === "face++") {
      const apiKey = process.env.FACEPP_API_KEY;
      const apiSecret = process.env.FACEPP_API_SECRET;
      const apiEndpoint = process.env.FACEPP_API_ENDPOINT || "https://api-us.faceplusplus.com";

      if (!apiKey || !apiSecret) {
        return NextResponse.json({
          verified: false,
          reason: "FACEPP_NOT_CONFIGURED",
          message: "Face++ n'est pas configuré."
        }, { status: 503 });
      }

      const params = new URLSearchParams();
      params.append("api_key", apiKey);
      params.append("api_secret", apiSecret);
      params.append("image_base64", image.split(",")[1]);
      params.append("return_attributes", "quality,blur,headpose");

      const detectResponse = await fetch(`${apiEndpoint}/facepp/v3/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const detectData = await detectResponse.json();
      if (!detectResponse.ok) {
        return NextResponse.json({
          verified: false,
          reason: "FACEPP_ERROR",
          message: detectData?.error_message || "Erreur Face++"
        }, { status: 502 });
      }

      const faceCount = detectData?.faces?.length || 0;
      if (faceCount === 0) {
        return NextResponse.json({
          verified: false,
          reason: "NO_FACE_DETECTED",
          message: "Aucun visage détecté. Veuillez vous positionner face à la caméra."
        });
      }

      if (faceCount > 1) {
        return NextResponse.json({
          verified: false,
          reason: "MULTIPLE_FACES",
          message: "Plusieurs visages détectés. Assurez-vous d'être seul dans le cadre."
        });
      }

      let match = true;
      let confidence = 0.9;
      let mode: "detect" | "compare" = "detect";

      if (requireMatch) {
        const refBuffer = await getReferenceImage();
        if (!refBuffer) {
          return NextResponse.json({
            verified: false,
            reason: "NO_REFERENCE",
            message: "Aucune image de référence disponible pour vérifier l'identité."
          });
        }

        mode = "compare";

        const compareParams = new URLSearchParams();
        compareParams.append("api_key", apiKey);
        compareParams.append("api_secret", apiSecret);
        compareParams.append("image_base64_1", image.split(",")[1]);
        compareParams.append("image_base64_2", refBuffer.toString("base64"));

        const compareResponse = await fetch(`${apiEndpoint}/facepp/v3/compare`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: compareParams.toString(),
        });

        const compareData = await compareResponse.json();
        if (!compareResponse.ok) {
          return NextResponse.json({
            verified: false,
            reason: "FACEPP_COMPARE_ERROR",
            message: compareData?.error_message || "Erreur Face++ Compare"
          }, { status: 502 });
        }

        confidence = (compareData?.confidence || 0) / 100;
        match = confidence >= threshold;
      }

      return NextResponse.json({
        verified: match,
        match,
        mode,
        confidence,
        faceDetected: true,
        faceCount: 1,
        message: match ? "Visage vérifié avec succès" : "Visage non reconnu",
        timestamp: new Date().toISOString()
      });
    }

    if (provider === "aws") {
      const region = process.env.AWS_REGION;
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

      if (!region || !accessKeyId || !secretAccessKey) {
        return NextResponse.json({
          verified: false,
          reason: "AWS_NOT_CONFIGURED",
          message: "AWS Rekognition n'est pas configuré."
        }, { status: 503 });
      }

      try {
        const { RekognitionClient, DetectFacesCommand, CompareFacesCommand } = await import("@aws-sdk/client-rekognition");
        const client = new RekognitionClient({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });

        const detectCommand = new DetectFacesCommand({
          Image: { Bytes: imageBuffer },
          Attributes: ["DEFAULT"]
        });

        const detectResult = await client.send(detectCommand);
        const faceCount = detectResult.FaceDetails?.length || 0;

        if (faceCount === 0) {
          return NextResponse.json({
            verified: false,
            reason: "NO_FACE_DETECTED",
            message: "Aucun visage détecté. Veuillez vous positionner face à la caméra."
          });
        }

        if (faceCount > 1) {
          return NextResponse.json({
            verified: false,
            reason: "MULTIPLE_FACES",
            message: "Plusieurs visages détectés. Assurez-vous d'être seul dans le cadre."
          });
        }

        let match = true;
        let confidence = 0.9;
        let mode: "detect" | "compare" = "detect";

        if (requireMatch) {
          const refBuffer = await getReferenceImage();
          if (!refBuffer) {
            return NextResponse.json({
              verified: false,
              reason: "NO_REFERENCE",
              message: "Aucune image de référence disponible pour vérifier l'identité."
            });
          }

          mode = "compare";

          const compareCommand = new CompareFacesCommand({
            SourceImage: { Bytes: refBuffer },
            TargetImage: { Bytes: imageBuffer },
            SimilarityThreshold: threshold * 100,
          });

          const compareResult = await client.send(compareCommand);
          const similarity = compareResult.FaceMatches?.[0]?.Similarity || 0;
          confidence = similarity / 100;
          match = similarity >= threshold * 100;
        }

        return NextResponse.json({
          verified: match,
          match,
          mode,
          confidence,
          faceDetected: true,
          faceCount: 1,
          message: match ? "Visage vérifié avec succès" : "Visage non reconnu",
          timestamp: new Date().toISOString()
        });
      } catch (awsError: any) {
        return NextResponse.json({
          verified: false,
          reason: "AWS_ERROR",
          message: awsError.message || "Erreur AWS Rekognition"
        }, { status: 502 });
      }
    }

    return NextResponse.json({
      verified: false,
      reason: "PROVIDER_NOT_SUPPORTED",
      message: "Fournisseur de reconnaissance faciale non supporté."
    }, { status: 400 });
  } catch (error: any) {
    console.error("Face verification error:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de la vérification du visage",
        verified: false,
        reason: "VERIFICATION_ERROR",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
