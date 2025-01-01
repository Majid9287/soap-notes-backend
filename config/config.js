import dotenv from 'dotenv';

dotenv.config();

export default {
    port: process.env.PORT || 8080,
    mongodbUri: process.env.MONGO_URI,
    jwtSecret: process.env.ACCESS_TOKEN_SECRET,
    openaiApiKey: process.env.OPENAI_API_KEY,
    googleCloudKeyFileEnc:process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
};

