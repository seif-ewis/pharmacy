import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config(); // Automatically uses CLOUDINARY_URL from process.env if available

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'hosam_pharmacy/avatars',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

export const upload = multer({ storage: storage });
