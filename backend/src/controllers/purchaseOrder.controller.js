'use strict';

/**
 * purchaseOrder.controller.js
 * ---------------------------
 * GET  /api/v1/purchase-orders          → list all POs (filterable by status)
 * GET  /api/v1/purchase-orders/:id      → get single PO
 * POST /api/v1/purchase-orders          → create new PO
 * PATCH /api/v1/purchase-orders/:id/status → update PO status
 */

const PurchaseOrder   = require('../models/purchaseOrder.model');
const Vendor          = require('../models/vendor.model');
const AppError        = require('../models/errors/AppError');

// ── Utility: generate PO number ───────────────────────────────────────────────
const generatePoNumber = async () => {
  const year  = new Date().getFullYear();
  const count = await PurchaseOrder.count();
  const seq   = String(count + 1).padStart(4, '0');
  return `PO-${year}-${seq}`;
};

// ── GET /api/v1/purchase-orders ───────────────────────────────────────────────
const listPurchaseOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();

    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'name', 'contactEmail'] }],
      order:   [['createdAt', 'DESC']],
      limit:   Number(limit),
      offset:  (Number(page) - 1) * Number(limit),
    });

    return res.status(200).json({
      success: true,
      data:    rows,
      meta:    { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) { next(err); }
};

// ── GET /api/v1/purchase-orders/:id ──────────────────────────────────────────
const getPurchaseOrderById = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'name', 'contactEmail'] }],
    });
    if (!po) return next(new AppError(`Purchase order '${req.params.id}' not found.`, 404));
    return res.status(200).json({ success: true, data: po });
  } catch (err) { next(err); }
};

// ── POST /api/v1/purchase-orders ──────────────────────────────────────────────
const createPurchaseOrder = async (req, res, next) => {
  try {
    const { vendorId, lineItems, notes, expectedDeliveryDate } = req.body;

    // Validate vendor exists
    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) return next(new AppError(`Vendor '${vendorId}' not found.`, 404));

    // Calculate totals from lineItems
    const totalUnits = lineItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalCost  = lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost || 0)), 0);

    const poNumber = await generatePoNumber();

    const po = await PurchaseOrder.create({
      poNumber,
      vendorId,
      lineItems,
      totalUnits,
      totalCost,
      notes,
      expectedDeliveryDate: expectedDeliveryDate || null,
      status:    'PENDING',
      createdBy: req.user?.sub || null,
    });

    return res.status(201).json({ success: true, data: po });
  } catch (err) { next(err); }
};

// ── PATCH /api/v1/purchase-orders/:id/status ─────────────────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['PENDING', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED'];
    if (!allowed.includes(status?.toUpperCase())) {
      return next(new AppError(`Invalid status. Allowed: ${allowed.join(', ')}`, 400));
    }

    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return next(new AppError(`Purchase order '${req.params.id}' not found.`, 404));

    await po.update({ status: status.toUpperCase() });
    return res.status(200).json({ success: true, data: po });
  } catch (err) { next(err); }
};

module.exports = { listPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updateStatus };
