import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Bill } from "../models/Bill.js";
import { Subsystem } from "../models/Subsystem.js";
import { ApiError } from "../utils/ApiError.js";
import { buildBillExportBuffer, generateMonthlyReportBuffer, generateSubsystemReportBuffer } from "../services/reportService.js";

function sendXlsx(res: Response, filename: string, buffer: Buffer) {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

export const exportBills = asyncHandler(async (req: Request, res: Response) => {
  const query: Record<string, unknown> = { status: "APPROVED" };
  if (req.query.status) query.status = req.query.status;
  if (req.query.subsystem) query.subsystem = req.query.subsystem;

  const bills = await Bill.find(query).sort("billDate").populate("uploadedBy", "displayName").lean();
  const buffer = await buildBillExportBuffer("Bills Export", bills as never);
  sendXlsx(res, "asterix-bills-export.xlsx", buffer);
});

export const exportSubsystem = asyncHandler(async (req: Request, res: Response) => {
  const subsystem = await Subsystem.findById(req.params.id);
  if (!subsystem) throw ApiError.notFound("Subsystem not found");
  const { buffer } = await generateSubsystemReportBuffer(req.params.id);
  sendXlsx(res, `${subsystem.name}-report.xlsx`, buffer);
});

export const exportMonth = asyncHandler(async (req: Request, res: Response) => {
  // Unvalidated params would reach generateMonthlyReportBuffer as NaN and produce an
  // "undefined <year>" worksheet over an invalid date range instead of a clear 400.
  const year = Number(req.params.year);
  const month = Number(req.params.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw ApiError.badRequest("Invalid year: expected a four-digit year between 2000 and 2100");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw ApiError.badRequest("Invalid month: expected a number between 1 and 12");
  }

  const key = `${year}-${String(month).padStart(2, "0")}`;
  const { buffer } = await generateMonthlyReportBuffer(key);
  sendXlsx(res, `${key}-report.xlsx`, buffer);
});
