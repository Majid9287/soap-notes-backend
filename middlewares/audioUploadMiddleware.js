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
    ".aif", ".aifc", ".opus", ".mogg", ".3gp"
  ];
};

// Multer configuration with size limits
const multerConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: async (req, file, cb) => {
    try {
      // First check if the mimetype starts with 'audio/'
      if (!file.mimetype.startsWith("audio/")) {
        const specialMimeTypes = [
          "application/ogg",        // Some .ogg files
          "video/ogg",             // Some audio files in .ogg container
          "application/octet-stream" // Some raw audio files
        ];
        
        if (!specialMimeTypes.includes(file.mimetype)) {
          throw new AppError("File must be an audio format", 400);
        }
      }

      // Store the original filename and mimetype for later use
      req.audioFileInfo = {
        originalName: file.originalname,
        mimeType: file.mimetype,
        encoding: file.encoding,
      };

      cb(null, true);
    } catch (error) {
      cb(new AppError(error.message || "Error processing audio file", error.statusCode || 400));
    }
  },
};

// Create multer instance
const upload = multer(multerConfig);

// Wrapper function for better error handling
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

      // Skip validation if no file is provided
      if (!req.file) {
        return next(); // Proceed without throwing an error
      }

      // Verify file type using file-type library
      const fileType = await fileTypeFromBuffer(req.file.buffer);
      if (fileType) {
        req.audioFileInfo = {
          ...req.audioFileInfo,
          detectedMimeType: fileType.mime,
          detectedExtension: fileType.ext,
        };

        // Verify it's actually an audio file
        const supportedFormats = getSupportedAudioFormats().map((f) => f.replace(".", ""));
        if (
          !fileType.mime.startsWith("audio/") &&
          !supportedFormats.includes(fileType.ext)
        ) {
          throw new AppError("Invalid audio file format", 400);
        }
      }

      req.audioFileInfo.size = req.file.size;
      req.audioFileInfo.uploadedAt = new Date();

      next();
    } catch (error) {
      next(error);
    }
  });
};

export default audioUpload;
