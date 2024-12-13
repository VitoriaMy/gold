import { Router } from "express";
import * as dataAPI from "./dataAPI.js";
import query from "./query.js";


const router = Router();
router.use((req, res, next) => {
    // 禁用缓存
    // res.setHeader("Cache-Control", "no-store");
    next();
});

router.get("/summary", async (req, res) => {
    const result = await query(dataAPI.summary);
    const {
        status = 500,
        data
    } = result;
    if (status === 200) {
        res.json(data);
    } else {
        res.status(status).send(result.message);
    }
});

router.get("/today", async (req, res) => {
    const result = await query(dataAPI.today);
    const {
        status = 500,
        data
    } = result;
    if (status === 200) {
        res.json(data);
    } else {
        res.status(status).send(result.message);
    }
});

router.get("/month", async (req, res) => {
    const result = await query(dataAPI.month);
    const {
        status = 500,
        data
    } = result;
    if (status === 200) {
        res.json(data);
    } else {
        res.status(status).send(result.message);
    }
});


export default router;