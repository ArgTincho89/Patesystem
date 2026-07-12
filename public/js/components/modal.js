const Modal = {
  show(title, content, options = {}) {
    const root = $('#modal-root');
    clearElement(root);

    const overlay = create('div', {
      className: 'modal-overlay',
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 150, padding: '16px'
      }
    });

    const modal = create('div', {
      className: 'card fade-in',
      style: { width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }
    });

    const header = create('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }
    }, [
      create('h3', { textContent: title, style: { fontSize: 'var(--font-lg)', fontWeight: '700' } }),
      create('button', {
        textContent: '✕',
        style: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' },
        onClick: () => this.hide()
      })
    ]);

    modal.appendChild(header);

    if (typeof content === 'string') {
      const body = create('div', { innerHTML: content });
      modal.appendChild(body);
    } else if (content instanceof HTMLElement) {
      modal.appendChild(content);
    }

    if (options.footer) {
      const footer = create('div', {
        style: { marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }
      });
      if (typeof options.footer === 'string') {
        footer.innerHTML = options.footer;
      } else {
        footer.appendChild(options.footer);
      }
      modal.appendChild(footer);
    }

    overlay.appendChild(modal);
    on(overlay, 'click', (e) => {
      if (e.target === overlay) this.hide();
    });

    root.appendChild(overlay);
  },

  hide() {
    const root = $('#modal-root');
    clearElement(root);
  }
};
