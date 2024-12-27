import multer from "multer";
import AppError from "../utils/appError.js";  // Import the custom AppError class

const audioUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Allowed MIME types for audio files
    const allowedMimeTypes = [
        "audio/mpeg",       // .mp3
        "audio/wav",        // .wav
        "audio/ogg",        // .ogg
        "audio/x-m4a",      // .m4a
        "audio/flac",       // .flac
        "audio/aac",        // .aac
        "audio/x-ms-wma",   // .wma
        "audio/webm",       // .webm
        "audio/x-aiff",     // .aiff
        "audio/basic",      // .au, .snd
        "audio/midi",       // .midi, .mid
        "audio/x-midi",     // .midi, .mid
        "audio/x-wav",      // .wav (alternate type)
        "audio/x-pn-realaudio", // .ra
        "audio/x-pn-realaudio-plugin", // .rmp
        "audio/vnd.rn-realaudio", // .ra
        "audio/x-aac",      // .aac (alternate type)
        "audio/x-flac",     // .flac (alternate type)
        "audio/x-mpegurl",  // .m3u
        "audio/mpegurl",    // .m3u (alternate type)
        "audio/x-scpls",    // .pls
        "audio/adpcm",      // .adpcm
      ];
      
    // Check MIME type
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      // Create a custom AppError instead of the default Error
      const error = new AppError("Only audio files are allowed!", 400); // 400 is the HTTP status code for Bad Request
      cb(error, false); // Reject the file with the custom error
    }
  },
}).single("audioFile");

export default audioUpload;
