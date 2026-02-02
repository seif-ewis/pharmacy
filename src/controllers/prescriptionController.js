
import db from '../config/dataBase.js';
import { upload } from '../config/cloudinary.js';

// Render Upload Page
export const getUploadPage = (req, res) => {
    res.render('prescription/upload', {
        pageTitle: 'Upload Prescription',
        user: req.user
    });
};

// Handle Image Upload
export const uploadPrescription = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error', 'Please upload an image.');
            return res.redirect('/prescription/upload');
        }

        const imageUrl = req.file.path;

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                "INSERT INTO prescriptions (id, user_id, image_url, status, created_at) VALUES (gen_random_uuid(), $1, $2, 'pending', NOW()) RETURNING id",
                [req.user.id, imageUrl]
            );

            const prescriptionId = result.rows[0].id;

            await client.query('COMMIT');

            req.flash('success', 'Prescription uploaded successfully!');
            res.redirect(`/prescription/${prescriptionId}`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Upload Prescription DB Error:', err);
            req.flash('error', 'Failed to save prescription.');
            res.redirect('/prescription/upload');
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Upload Prescription Error:', err);
        req.flash('error', 'Something went wrong.');
        res.redirect('/prescription/upload');
    }
};

// Get Prescription Details
export const getPrescriptionDetails = async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
        // Fetch Prescription
        const pRes = await client.query(
            "SELECT * FROM prescriptions WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );

        if (pRes.rows.length === 0) {
            req.flash('error', 'Prescription not found.');
            return res.redirect('/profile');
        }

        const prescription = pRes.rows[0];

        // Fetch Final Details (if processed)
        // prescription_final has final_meds (jsonb), total_price
        const finalRes = await client.query(
            "SELECT * FROM prescription_final WHERE prescription_id = $1",
            [id]
        );

        let finalDetails = null;
        if (finalRes.rows.length > 0) {
            finalDetails = finalRes.rows[0];
            // Ensure final_meds is parsed if it's a string, or used directly if jsonb
            // Postgres node driver usually parses jsonb automatically
        }

        res.render('prescription/details', {
            pageTitle: 'Prescription Details',
            user: req.user,
            prescription,
            finalDetails
        });

    } catch (err) {
        console.error('Get Prescription Details Error:', err);
        req.flash('error', 'Failed to load details.');
        res.redirect('/profile');
    } finally {
        client.release();
    }
};
