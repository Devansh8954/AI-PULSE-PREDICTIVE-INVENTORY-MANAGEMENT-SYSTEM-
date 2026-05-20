'use strict';

/**
 * user.model.js
 * -------------
 * Sequelize model for the `users` table.
 *
 * Design decisions:
 *  - Password is stored as a bcrypt hash; the raw value is NEVER persisted.
 *  - `role` ENUM matches the roles checked in auth.middleware.js.
 *  - `paranoid: true` (global default) adds soft-delete via deletedAt.
 *  - `defaultScope` excludes the passwordHash from every SELECT automatically.
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../config/db.config');

class User extends Model {}

User.init(
  {
    id: {
      type:         DataTypes.CHAR(36),
      primaryKey:   true,
      defaultValue: DataTypes.UUIDV4,
      allowNull:    false,
    },

    name: {
      type:      DataTypes.STRING(150),
      allowNull: false,
      validate:  {
        notEmpty: { msg: 'Name cannot be empty.' },
        len:      { args: [2, 150], msg: 'Name must be between 2 and 150 characters.' },
      },
    },

    email: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      unique:    { name: 'uq_user_email', msg: 'A user with that email already exists.' },
      validate:  {
        isEmail:  { msg: 'Must be a valid email address.' },
        notEmpty: { msg: 'Email cannot be empty.' },
      },
    },

    passwordHash: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      comment:   'bcrypt hash — never expose in API responses',
    },

    role: {
      type:         DataTypes.ENUM('ADMIN', 'MANAGER', 'WAREHOUSE', 'VIEWER'),
      allowNull:    false,
      defaultValue: 'VIEWER',
    },

    isActive: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName:     'User',
    tableName:     'users',
    freezeTableName: true,

    // Always exclude passwordHash from query results unless explicitly requested
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },

    // Named scope to fetch passwordHash when needed (e.g. login)
    scopes: {
      withPassword: { attributes: {} },
    },

    indexes: [
      { fields: ['email'] },
      { fields: ['role'] },
    ],
  }
);

module.exports = User;
