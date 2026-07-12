const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son obligatorios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const db = req.app.locals.db;

    if (db.findUserByName(nombre)) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese nombre de usuario' });
    }

    if (db.findUserByEmail(email.toLowerCase())) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = db.createUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      nombre
    });

    req.session.userId = user.id;

    res.status(201).json({
      id: user.id,
      email: user.email,
      nombre: user.nombre
    });
  } catch (err) {
    console.error('[REGISTER]', err);
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { nombre, password } = req.body;

    if (!nombre || !password) {
      return res.status(400).json({ error: 'Nombre y contraseña son obligatorios' });
    }

    const db = req.app.locals.db;
    const user = db.findUserByName(nombre);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    req.session.userId = user.id;

    res.json({
      id: user.id,
      email: user.email,
      nombre: user.nombre
    });
  } catch (err) {
    console.error('[LOGIN]', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const db = req.app.locals.db;
  const user = db.findUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  res.json({
    id: user.id,
    email: user.email,
    nombre: user.nombre
  });
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email obligatorio' });
    }

    const db = req.app.locals.db;
    const user = db.findUserByEmail(email.toLowerCase());

    if (!user) {
      return res.json({ ok: true, message: 'Si el email existe, recibirás un enlace de recuperación' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000;

    db.updateUser(user.id, {
      resetToken: token,
      resetTokenExpires: expires
    });

    await sendPasswordResetEmail(user.email, token);

    res.json({ ok: true, message: 'Si el email existe, recibirás un enlace de recuperación' });
  } catch (err) {
    console.error('[FORGOT-PASSWORD]', err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const db = req.app.locals.db;
    const users = db.findAll('users');
    const user = users.find(u => u.resetToken === token && u.resetTokenExpires > Date.now());

    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    db.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null
    });

    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[RESET-PASSWORD]', err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

module.exports = router;
