const LoginPage = {
  render() {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = 'none';
    content.style.paddingBottom = 'var(--space-xl)';

    content.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-logo">
            <h1>PateSystem</h1>
            <p>Finanzas personales</p>
          </div>
          <div class="login-tabs">
            <button class="login-tab active" data-tab="login">Iniciar sesión</button>
            <button class="login-tab" data-tab="register">Registrarse</button>
          </div>
          <form class="login-form active" id="login-form">
            <div class="form-group">
              <label>Nombre de usuario</label>
              <input type="text" class="form-control" id="login-nombre" required>
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" class="form-control" id="login-password" required>
            </div>
            <button type="submit" class="btn btn-primary btn-full">Iniciar sesión</button>
            <p class="text-center mt-md">
              <a href="#" id="forgot-link" style="font-size: var(--font-sm);">¿Olvidaste tu contraseña?</a>
            </p>
          </form>
          <form class="login-form" id="register-form">
            <div class="form-group">
              <label>Nombre</label>
              <input type="text" class="form-control" id="register-nombre" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" class="form-control" id="register-email" required>
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" class="form-control" id="register-password" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary btn-full">Crear cuenta</button>
          </form>
        </div>
      </div>
    `;

    $$('.login-tab').forEach(tab => {
      on(tab, 'click', () => {
        $$('.login-tab').forEach(t => t.classList.remove('active'));
        $$('.login-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        $(`#${tab.dataset.tab}-form`).classList.add('active');
      });
    });

    on($('#login-form'), 'submit', async (e) => {
      e.preventDefault();
      try {
        App.user = await API.auth.login({
          nombre: $('#login-nombre').value,
          password: $('#login-password').value
        });
        navbar.style.display = '';
        content.style.paddingBottom = '';
        Router.navigate('/home');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    on($('#register-form'), 'submit', async (e) => {
      e.preventDefault();
      try {
        App.user = await API.auth.register({
          nombre: $('#register-nombre').value,
          email: $('#register-email').value,
          password: $('#register-password').value
        });
        navbar.style.display = '';
        content.style.paddingBottom = '';
        Router.navigate('/home');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    on($('#forgot-link'), 'click', async (e) => {
      e.preventDefault();
      const form = create('div');
      form.innerHTML = `
        <div class="form-group">
          <label>Email</label>
          <input type="email" class="form-control" id="forgot-email" placeholder="Tu email">
        </div>
      `;
      const footer = create('div', { style: { display: 'flex', gap: '8px' } });
      footer.appendChild(create('button', {
        className: 'btn btn-ghost', textContent: 'Cancelar', onClick: () => Modal.hide()
      }));
      footer.appendChild(create('button', {
        className: 'btn btn-primary', textContent: 'Enviar enlace'
      }));

      Modal.show('Recuperar contraseña', form, { footer });

      on(footer.lastChild, 'click', async () => {
        const email = $('#forgot-email').value;
        if (!email) return showToast('Ingresá tu email', 'error');
        try {
          await API.auth.forgotPassword(email);
          Modal.hide();
          showToast('Si el email existe, recibirás un enlace');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  },

  renderReset(params) {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = 'none';

    content.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-logo">
            <h1>PateSystem</h1>
            <p>Nueva contraseña</p>
          </div>
          <form id="reset-form">
            <div class="form-group">
              <label>Nueva contraseña</label>
              <input type="password" class="form-control" id="reset-password" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary btn-full">Restablecer</button>
          </form>
        </div>
      </div>
    `;

    on($('#reset-form'), 'submit', async (e) => {
      e.preventDefault();
      try {
        await API.auth.resetPassword(params.token, $('#reset-password').value);
        showToast('Contraseña actualizada');
        Router.navigate('/login');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
