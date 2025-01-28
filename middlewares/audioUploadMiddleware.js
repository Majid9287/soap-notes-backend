import multer from "multer";
import AppError from "../utils/appError.js";
import { fileTypeFromBuffer } from "file-type";

// Helper function to get supported audio formats
export const getSupportedAudioFormats = () => {
  return [
    ".mp3", ".wav", ".ogg", ".m4a", ".flac",
    ".aac", ".wma", ".webm", ".aiff", ".au",
    ".snd", ".midi", ".mid", ".ra", ".rm",
    ".ram", ".pls", ".m3u", ".cda", ".amr",
    ".aif", ".aifc", ".opus", ".mogg", ".3gp",
    ".caf", ".mp4" // Added support for iPhone Safari formats
  ];
};

const multerConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 100MB limit
  },
  fileFilter: async (req, file, cb) => {
    try {
      if (!file.mimetype.startsWith("audio/") && 
          !["application/ogg", "video/ogg", "application/octet-stream", "audio/mp4"].includes(file.mimetype)) {
        throw new AppError("File must be an audio format", 400);
      }

      req.audioFileInfo = {
        originalName: file.originalname,
        mimeType: file.mimetype,
        encoding: file.encoding,
      };

      cb(null, true);
    } catch (error) {
      cb(error);
    }
  },
};

const upload = multer(multerConfig);

const audioUpload = async (req, res, next) => {
  upload.single("audioFile")(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          throw new AppError("File size too large. Maximum size is 100MB", 400);
        }
        throw new AppError(`Upload error: ${err.message}`, 400);
      }

      if (err) {
        throw new AppError(err.message || "Error uploading file", err.statusCode || 400);
      }

      if (req.body.input_type === "audio" && !req.file) {
        throw new AppError("Please upload audio file", 400);
      }

      if (req.file) {
        const fileType = await fileTypeFromBuffer(req.file.buffer);
        if (fileType) {
          req.audioFileInfo = {
            ...req.audioFileInfo,
            detectedMimeType: fileType.mime,
            detectedExtension: fileType.ext,
          };

          const supportedFormats = getSupportedAudioFormats().map((f) => f.replace(".", ""));
          if (!fileType.mime.startsWith("audio/") && !supportedFormats.includes(fileType.ext)) {
            throw new AppError("Invalid audio file format", 400);
          }
        }

        req.audioFileInfo.size = req.file.size;
        req.audioFileInfo.uploadedAt = new Date();
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};

export default audioUpload;