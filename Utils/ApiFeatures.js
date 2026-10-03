const CustomError = require('./CustomError');
const filterFields = new Set(['name', 'description', 'duration', 'ratings', 'totalRating', 'releaseYear', 'releaseDate', 'createdAt', 'genres', 'directors', 'actors', 'price', 'createdBy', 'coverImage', '_id']);
const comparisons = new Set(['gte', 'gt', 'lte', 'lt']);
class ApiFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = { ...queryStr };
  }

  filter() {
    const queryObj = { ...this.queryStr };
    ['page', 'sort', 'limit', 'fields'].forEach((field) => delete queryObj[field]);

    const conditions = {};
    for (const [field, value] of Object.entries(queryObj)) {
      if (!filterFields.has(field)) throw new CustomError(`Unsupported filter: ${field}`, 400);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const operators = {};
        for (const [operator, operand] of Object.entries(value)) {
          if (!comparisons.has(operator) || typeof operand !== 'string') throw new CustomError('Use only gt, gte, lt, or lte comparison filters.', 400);
          operators[`$${operator}`] = operand;
        }
        conditions[field] = operators;
      } else if (typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'))) {
        conditions[field] = value;
      } else throw new CustomError(`Invalid filter value for ${field}`, 400);
    }
    this.query = this.query.find(conditions);
    return this;
  }

  sort() {
    if (this.queryStr.sort) {
      const sortBy = Array.isArray(this.queryStr.sort)
        ? this.queryStr.sort.join(' ')
        : this.queryStr.sort.split(',').join(' ');

      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = Number(this.queryStr.page ?? 1);
    const requestedLimit = Number(this.queryStr.limit ?? 10);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) throw new CustomError('Page and limit must be positive whole numbers.', 400);
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    this.pagination = { page, limit, skip };
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = ApiFeatures;
