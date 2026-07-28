const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Hak akses ditolak. Peran '${req.user ? req.user.role : 'GUEST'}' tidak diizinkan mengakses resource ini.`
      });
    }
    next();
  };
};

module.exports = roleMiddleware;
