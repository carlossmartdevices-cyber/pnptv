/**
 * Pagination Helper for Admin Panel
 */

import { buildCallback } from './callbacks.js';

/**
 * Build pagination buttons
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {string} callbackPrefix - Base callback prefix (e.g., 'admin:users:list')
 * @param {object} options - Additional options
 * @returns {array} Array of pagination button rows
 */
export function buildPaginationButtons(currentPage, totalPages, callbackPrefix, options = {}) {
  const {
    showPageCount = true,
    prevText = '« Previous',
    nextText = 'Next »',
    pageText = 'Page {current}/{total}',
  } = options;

  const buttons = [];

  // Previous button
  if (currentPage > 1) {
    buttons.push({
      text: prevText,
      callback_data: `${callbackPrefix}:${currentPage - 1}`,
    });
  }

  // Page counter
  if (showPageCount) {
    buttons.push({
      text: pageText.replace('{current}', currentPage).replace('{total}', totalPages),
      callback_data: 'noop', // Non-interactive
    });
  }

  // Next button
  if (currentPage < totalPages) {
    buttons.push({
      text: nextText,
      callback_data: `${callbackPrefix}:${currentPage + 1}`,
    });
  }

  return buttons.length > 0 ? [buttons] : [];
}

/**
 * Calculate pagination info
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} perPage - Items per page
 * @returns {object} Pagination info
 */
export function calculatePagination(total, page = 1, perPage = 10) {
  const totalPages = Math.ceil(total / perPage);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const offset = (currentPage - 1) * perPage;

  return {
    total,
    currentPage,
    totalPages,
    perPage,
    offset,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

/**
 * Format pagination info for display
 * @param {object} pagination - Pagination info from calculatePagination
 * @param {string} lang - Language code
 * @returns {string} Formatted pagination text
 */
export function formatPaginationInfo(pagination, lang = 'en') {
  const { currentPage, totalPages, total, perPage } = pagination;
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  if (lang === 'es') {
    return `Página ${currentPage}/${totalPages} (mostrando ${start}-${end} de ${total})`;
  }

  return `Page ${currentPage}/${totalPages} (showing ${start}-${end} of ${total})`;
}

/**
 * Slice array for current page
 * @param {array} items - Array of items
 * @param {number} page - Page number
 * @param {number} perPage - Items per page
 * @returns {array} Sliced items
 */
export function paginateArray(items, page = 1, perPage = 10) {
  const { offset } = calculatePagination(items.length, page, perPage);
  return items.slice(offset, offset + perPage);
}

/**
 * Create pagination menu row
 * @param {number} currentPage - Current page
 * @param {number} totalPages - Total pages
 * @param {string} section - Admin section
 * @param {string} action - Admin action
 * @param {object} extraParams - Extra parameters to pass in callback
 * @returns {array} Keyboard row for pagination
 */
export function createPaginationRow(currentPage, totalPages, section, action, extraParams = {}) {
  const buttons = [];

  // Previous
  if (currentPage > 1) {
    const params = { ...extraParams, page: currentPage - 1 };
    const callback = buildCallback(section, `${action}:page`, String(currentPage - 1));
    buttons.push({ text: '« Previous', callback_data: callback });
  }

  // Counter
  buttons.push({
    text: `${currentPage}/${totalPages}`,
    callback_data: 'noop',
  });

  // Next
  if (currentPage < totalPages) {
    const callback = buildCallback(section, `${action}:page`, String(currentPage + 1));
    buttons.push({ text: 'Next »', callback_data: callback });
  }

  return buttons;
}

export default {
  buildPaginationButtons,
  calculatePagination,
  formatPaginationInfo,
  paginateArray,
  createPaginationRow,
};
