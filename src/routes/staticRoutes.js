import express from "express";

const router = express.Router();

router.get("/privacy-policy", (req, res) => {
    res.render("privacyPolicy");
});

router.get("/terms", (req, res) => {
    res.render("termOfUse");
});

router.get("/return-policy", (req, res) => {
    res.render("returnPolicy");
});

export default router;
