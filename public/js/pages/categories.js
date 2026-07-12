const CategoriesPage = {
  async render() {
    const content = $('#page-content');
    const navbar = $('#navbar');
    navbar.style.display = '';
    content.style.paddingBottom = '';

    content.innerHTML = '<div class="loading">Cargando...</div>';

    try {
      const categories = await API.categories.list();
      this.renderContent(content, categories);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><p>Error: ${err.message}</p></div>`;
    }
  },

  renderContent(content, categories) {
    content.innerHTML = '';

    const header = create('div', { className: 'page-header' }, [
      create('h2', { className: 'page-title', textContent: 'Categorías' }),
      create('button', {
        className: 'btn btn-primary btn-sm',
        textContent: '+ Nueva'
      })
    ]);

    on(header.lastChild, 'click', () => this.showCreateModal(content));

    content.appendChild(header);

    if (categories.length === 0) {
      content.appendChild(create('div', {
        className: 'empty-state',
        innerHTML: '<div class="empty-state-icon">📁</div><p class="empty-state-text">No tenés categorías creadas</p>'
      }));
      return;
    }

    const list = create('ul', { className: 'category-list' });

    categories.forEach(cat => {
      const li = create('li', { className: 'category-item' });

      const left = create('div', { className: 'category-item-left' });
      left.appendChild(create('span', {
        className: 'category-dot',
        style: { background: cat.color || '#6c6c7c', width: '12px', height: '12px', display: 'inline-block', borderRadius: '50%' }
      }));
      left.appendChild(create('span', { textContent: cat.nombre }));

      const actions = create('div', { className: 'category-item-actions' });

      const editBtn = create('button', {
        className: 'icon-btn',
        innerHTML: '✏️',
        title: 'Editar'
      });
      on(editBtn, 'click', () => this.showEditModal(content, cat));

      const deleteBtn = create('button', {
        className: 'icon-btn danger',
        innerHTML: '🗑️',
        title: 'Eliminar'
      });
      on(deleteBtn, 'click', () => this.deleteCategory(content, cat));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(left);
      li.appendChild(actions);
      list.appendChild(li);
    });

    content.appendChild(list);
  },

  showCreateModal(content) {
    const form = create('div');

    const nameGroup = create('div', { className: 'form-group' });
    nameGroup.appendChild(create('label', { textContent: 'Nombre' }));
    const nameInput = create('input', {
      className: 'form-control',
      type: 'text',
      placeholder: 'Ej: Supermercado'
    });
    nameGroup.appendChild(nameInput);
    form.appendChild(nameGroup);

    const colorGroup = create('div', { className: 'form-group' });
    colorGroup.appendChild(create('label', { textContent: 'Color' }));
    const colorPicker = this.createColorPicker();
    colorGroup.appendChild(colorPicker);
    form.appendChild(colorGroup);

    const footer = create('div', { style: { display: 'flex', gap: '8px' } });
    footer.appendChild(create('button', {
      className: 'btn btn-ghost',
      textContent: 'Cancelar',
      onClick: () => Modal.hide()
    }));
    footer.appendChild(create('button', {
      className: 'btn btn-primary',
      textContent: 'Crear'
    }));

    on(footer.lastChild, 'click', async () => {
      const nombre = nameInput.value.trim();
      if (!nombre) return showToast('El nombre es obligatorio', 'error');

      try {
        await API.categories.create({ nombre, color: colorPicker.dataset.selected || null });
        Modal.hide();
        showToast('Categoría creada');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    Modal.show('Nueva categoría', form, { footer });
    nameInput.focus();
  },

  showEditModal(content, cat) {
    const form = create('div');

    const nameGroup = create('div', { className: 'form-group' });
    nameGroup.appendChild(create('label', { textContent: 'Nombre' }));
    const nameInput = create('input', {
      className: 'form-control',
      type: 'text',
      value: cat.nombre
    });
    nameGroup.appendChild(nameInput);
    form.appendChild(nameGroup);

    const colorGroup = create('div', { className: 'form-group' });
    colorGroup.appendChild(create('label', { textContent: 'Color' }));
    const colorPicker = this.createColorPicker(cat.color);
    colorGroup.appendChild(colorPicker);
    form.appendChild(colorGroup);

    const footer = create('div', { style: { display: 'flex', gap: '8px' } });
    footer.appendChild(create('button', {
      className: 'btn btn-ghost',
      textContent: 'Cancelar',
      onClick: () => Modal.hide()
    }));
    footer.appendChild(create('button', {
      className: 'btn btn-primary',
      textContent: 'Guardar'
    }));

    on(footer.lastChild, 'click', async () => {
      const nombre = nameInput.value.trim();
      if (!nombre) return showToast('El nombre es obligatorio', 'error');

      try {
        await API.categories.update(cat.id, { nombre, color: colorPicker.dataset.selected || null });
        Modal.hide();
        showToast('Categoría actualizada');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    Modal.show('Editar categoría', form, { footer });
    nameInput.focus();
  },

  async deleteCategory(content, cat) {
    const footer = create('div', { style: { display: 'flex', gap: '8px' } });
    footer.appendChild(create('button', {
      className: 'btn btn-ghost',
      textContent: 'Cancelar',
      onClick: () => Modal.hide()
    }));
    footer.appendChild(create('button', {
      className: 'btn btn-danger',
      textContent: 'Eliminar'
    }));

    on(footer.lastChild, 'click', async () => {
      try {
        await API.categories.delete(cat.id);
        Modal.hide();
        showToast('Categoría eliminada');
        this.render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    Modal.show(
      'Eliminar categoría',
      create('p', { textContent: `¿Eliminar "${cat.nombre}"?` }),
      { footer }
    );
  },

  createColorPicker(selectedColor) {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#AA96DA', '#F38181', '#A8D8EA', '#FFA07A', '#DDA0DD', '#98D8C8', '#F7DC6F', '#85C1E9'];
    const wrapper = create('div', { className: 'color-picker' });
    wrapper.dataset.selected = selectedColor || colors[0];

    colors.forEach(color => {
      const dot = create('button', {
        className: `color-option ${color === (selectedColor || colors[0]) ? 'selected' : ''}`,
        style: { background: color }
      });
      on(dot, 'click', (e) => {
        e.preventDefault();
        wrapper.querySelectorAll('.color-option').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        wrapper.dataset.selected = color;
      });
      wrapper.appendChild(dot);
    });

    return wrapper;
  }
};
