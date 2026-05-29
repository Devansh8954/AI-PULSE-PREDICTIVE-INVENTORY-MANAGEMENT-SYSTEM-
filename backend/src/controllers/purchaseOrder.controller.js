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
const AppError        = require('../errors/AppError');

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
    const role      = req.user?.role;
    const newStatus = status?.toUpperCase();

    // ── Validate the requested status value ───────────────────────────────────
    const allowed = ['PENDING', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED'];
    if (!allowed.includes(newStatus)) {
      return next(new AppError(`Invalid status. Allowed: ${allowed.join(', ')}`, 400));
    }

    // ── Role-based transition rules ───────────────────────────────────────────
    //  MANAGER   → may only Approve or Cancel
    //  WAREHOUSE → may only Dispatch or Receive
    //  ADMIN     → unrestricted
    const MANAGER_ALLOWED   = new Set(['APPROVED', 'CANCELLED']);
    const WAREHOUSE_ALLOWED = new Set(['DISPATCHED', 'RECEIVED']);

    if (role === 'MANAGER' && !MANAGER_ALLOWED.has(newStatus)) {
      return next(new AppError(
        'Managers may only Approve or Cancel a PO. Dispatching and receiving must be actioned by the Warehouse team.',
        403,
      ));
    }
    if (role === 'WAREHOUSE' && !WAREHOUSE_ALLOWED.has(newStatus)) {
      return next(new AppError(
        'Warehouse staff may only mark a PO as Dispatched or Received. Approval and cancellation must be done by the Manager.',
        403,
      ));
    }

    // ── Fetch PO and guard against illogical transitions ─────────────────────
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return next(new AppError(`Purchase order '${req.params.id}' not found.`, 404));

    const VALID_TRANSITIONS = {
      PENDING:    ['APPROVED', 'CANCELLED'],
      APPROVED:   ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['RECEIVED'],
      RECEIVED:   [],   // terminal
      CANCELLED:  [],   // terminal
    };
    const validNext = VALID_TRANSITIONS[po.status] ?? [];
    if (!validNext.includes(newStatus)) {
      return next(new AppError(
        `Cannot move a PO from ${po.status} to ${newStatus}. Valid next: ${validNext.join(', ') || 'none (terminal state)'}.`,
        400,
      ));
    }

    await po.update({ status: newStatus });
    return res.status(200).json({ success: true, data: po });
  } catch (err) { next(err); }
};

module.exports = { listPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updateStatus };
