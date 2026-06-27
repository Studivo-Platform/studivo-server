// Standard pagination helper — used in all list endpoints
// Usage: const { skip, limit, page } = paginate(req.query)
const paginate = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

// Builds a standard paginated response object
// Usage: return res.json(new ApiResponse(200, paginatedResponse(data, total, page, limit)))
const paginatedResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext:    page * limit < total,
    hasPrev:    page > 1,
  },
});

module.exports = { paginate, paginatedResponse };