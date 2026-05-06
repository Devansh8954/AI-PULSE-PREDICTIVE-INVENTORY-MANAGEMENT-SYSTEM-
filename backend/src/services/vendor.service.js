'use strict';

/**
 * vendor.service.js — LAYER 2 Business Logic.
 */

const { Vendor }    = require('../models');
const NotFoundError = require('../models/errors/NotFoundError');

const listVendors = async ({ page = 1, limit = 20 }) => {
  const offset = (Math.max(1, page) - 1) * Math.min(limit, 100);

  const { rows: data, count: total } = await Vendor.findAndCountAll({
    where:  { isActive: true },
    limit:  Math.min(limit, 100),
    offset,
    order:  [['name', 'ASC']],
  });

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

const getVendorById = async (id) => {
  const vendor = await Vendor.findOne({ where: { id, isActive: true } });
  if (!vendor) throw new NotFoundError(`Vendor '${id}' not found.`);
  return vendor;
};

const createVendor = async (dto) => {
  return Vendor.create(dto);
};

module.exports = { listVendors, getVendorById, createVendor };
