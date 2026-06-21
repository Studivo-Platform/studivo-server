// Wraps async controller functions so we don't need try/catch in every controller
// Without this: every controller needs try { ... } catch(err) { next(err) }
// With this:    export const myController = asyncHandler(async (req, res) => { ... })

/* 
استخدام try/catch بدون الحاجة إلى try { ... } catch(err) { next(err)
وانا شايف ان دي احسن طريقة تستخدم لحل وتنظيم الكود اكتر
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };