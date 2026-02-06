import { Router } from "express";
import * as dataAPI from "./dataAPI.js";
import query from "./query.js";
import { upsertGoldSeries } from "../db/goldSeries.js";
import { readGoldSeries } from "../db/goldRead.js";


const router = Router();
router.use((req, res, next) => {
    // 禁用缓存
    res.setHeader("Cache-Control", "no-store");
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
        try {
            await upsertGoldSeries({
                range: "1d",
                payload: data,
            });
        } catch {
            // ignore logging errors
        }
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
        try {
            await upsertGoldSeries({
                range: "30d",
                payload: data,
            });
        } catch {
            // ignore logging errors
        }
        res.json(data);
    } else {
        res.status(status).send(result.message);
    }
});

// Read-only: returns already saved 30d series from sqlite.
router.get("/month_saved", async (req, res) => {
    try {
        const rows = await readGoldSeries("30d");
        res.json(rows);
    } catch (e) {
        res.status(500).send(e?.message || "DB error");
    }
});


export default router;