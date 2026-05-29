'use strict';

/**
 * vendor.service.js — LAYER 2 Business Logic.
 *
 * Enforces the Controller → Service → Repository pattern:
 * all DB calls go through VendorRepository, keeping this layer
 * free of Sequelize model references.
 */

const VendorRepository = require('../repositories/vendor.repository');
const NotFoundError    = require('../errors/NotFoundError');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

const listVendors = async ({ page = 1, limit = DEFAULT_LIMIT }) => {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  const offset    = (Math.max(1, page) - 1) * safeLimit;

  const { rows: data, count: total } = await VendorRepository.findAll({
    limit:  safeLimit,
    offset,
  });

  return {
    data,
    meta: { total, page, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
  };
};

const getVendorById = async (id) => {
  const vendor = await VendorRepository.findById(id);
  if (!vendor) throw new NotFoundError(`Vendor '${id}' not found.`);
  return vendor;
};

const createVendor = async (dto) => VendorRepository.create(dto);

module.exports = { listVendors, getVendorById, createVendor };
