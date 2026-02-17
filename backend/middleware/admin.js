function authorizeAdmin(req, res, next) {
  if (!req.currentUser || req.currentUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'This action requires administrator privileges'
    });
  }
  next();
}

module.exports = authorizeAdmin;
