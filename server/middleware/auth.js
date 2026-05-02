export function requireAuth(req, res, next) {
  if (req.isAuthenticated?.() && req.user) return next();
  return res.status(401).json({ message: "Debes iniciar sesion." });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Sesion requerida." });
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: "No tienes permisos para esta accion." });
  };
}
