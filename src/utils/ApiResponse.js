/*  اللي مش هيكتب كومنتات زي الناس هزنعله  */


// Consistent JSON response shape across all endpoints
// Success:  { success: true,  data: {...},  message: '...' }
// Always use this so frontend knows what to expect
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.success    = statusCode < 400;
    this.statusCode = statusCode;
    this.message    = message;
    this.data       = data;
  }
}

module.exports = { ApiResponse };