const App = {
  user: null,

  async init() {
    this.registerSW();
    this.renderNavbar();

    try {
      this.user = await API.auth.me();
      if (!window.location.hash || window.location.hash === '#/login') {
        Router.navigate('/home');
      }
    } catch {
      this.user = null;
      Router.navigate('/login');
    }

    Router.register('/login', () => LoginPage.render());
    Router.register('/home', (params) => {
      if (!this.user) return Router.navigate('/login');
      HomePage.render(params);
    });
    Router.register('/summary', (params) => {
      if (!this.user) return Router.navigate('/login');
      SummaryPage.render(params);
    });
    Router.register('/trends', (params) => {
      if (!this.user) return Router.navigate('/login');
      TrendsPage.render(params);
    });
    Router.register('/categories', () => {
      if (!this.user) return Router.navigate('/login');
      CategoriesPage.render();
    });
    Router.register('/reset-password', (params) => LoginPage.renderReset(params));

    Router.init();
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });
        })
        .catch(err => console.warn('SW registration failed:', err));
    }
  },

  renderNavbar() {
    const navbar = $('#navbar');
    navbar.className = 'navbar';
    navbar.innerHTML = `
      <button class="navbar-item" data-route="/home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Inicio</span>
      </button>
      <button class="navbar-item" data-route="/summary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span>Resumen</span>
      </button>
      <button class="navbar-item" data-route="/categories">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        <span>Categorías</span>
      </button>
      <button class="navbar-item" data-route="/trends">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>Tendencias</span>
      </button>
    `;

    $$('.navbar-item', navbar).forEach(item => {
      on(item, 'click', () => Router.navigate(item.dataset.route));
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
