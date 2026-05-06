'use strict';

/**
 * vendor.controller.js — LAYER 1 HTTP only.
 */

const VendorService = require('../services/vendor.service');

const listVendors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await VendorService.listVendors({ page: Number(page), limit: Number(limit) });
    return res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getVendorById = async (req, res, next) => {
  try {
    const vendor = await VendorService.getVendorById(req.params.id);
    return res.status(200).json({ success: true, data: vendor });
  } catch (err) { next(err); }
};

const createVendor = async (req, res, next) => {
  try {
    const vendor = await VendorService.createVendor(req.body);
    return res.status(201).json({ success: true, data: vendor });
  } catch (err) { next(err); }
};

module.exports = { listVendors, getVendorById, createVendor };
